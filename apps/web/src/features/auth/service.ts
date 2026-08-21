import 'server-only'
import { db } from '@/server/db'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { hashToken, randomToken } from '@/server/crypto'
import { hashPassword, verifyPassword } from '@/server/auth/password'
import { createSession } from '@/server/auth/session'
import { mailer } from '@/server/mailer'
import { createOrganization } from '@/features/organizations/service'
import { recordAudit } from '@/server/audit'

const TOKEN_TTL_MS = { EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, PASSWORD_RESET: 60 * 60 * 1000 }

export type SignupInput = {
  email: string
  password: string
  name?: string | null
  organizationName?: string | null
}

export async function signup(input: SignupInput, meta: { userAgent?: string | null; ip?: string | null } = {}) {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } })
  if (existing) throw AppError.conflict('このメールアドレスは既に登録されています')

  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name ?? null,
      passwordHash: await hashPassword(input.password),
    },
  })

  await createOrganization({
    name: input.organizationName?.trim() || `${input.name ?? input.email.split('@')[0]} の組織`,
    ownerId: user.id,
  })

  await sendVerificationEmail(user.id, user.email)
  await createSession(user.id, meta)

  return { id: user.id, email: user.email }
}

export async function login(
  input: { email: string; password: string },
  meta: { userAgent?: string | null; ip?: string | null } = {},
) {
  const user = await db.user.findUnique({ where: { email: input.email } })
  // ユーザーの存在有無を漏らさないため、いずれの失敗でも同じメッセージを返す。
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : false
  if (!user || !valid) throw AppError.unauthorized('メールアドレスまたはパスワードが正しくありません')

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await createSession(user.id, meta)
  return { id: user.id, email: user.email }
}

export async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = randomToken()
  await db.verificationToken.create({
    data: {
      userId,
      email,
      kind: 'EMAIL_VERIFICATION',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS.EMAIL_VERIFICATION),
    },
  })

  await mailer().send({
    to: email,
    subject: '【AI商品開発OS】メールアドレスの確認',
    text: `以下のリンクからメールアドレスを確認してください(24時間有効)。\n\n${env.appUrl}/verify-email?token=${token}`,
  })
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await db.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (
    !record ||
    record.kind !== 'EMAIL_VERIFICATION' ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    !record.userId
  ) {
    throw AppError.validation('リンクが無効か、有効期限が切れています')
  }

  await db.$transaction([
    db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ])
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } })
  // 存在しないアドレスでも成功として扱い、アカウントの有無を漏らさない。
  if (!user) {
    logger.info('auth.reset_requested_unknown_email')
    return
  }

  const token = randomToken()
  await db.verificationToken.create({
    data: {
      userId: user.id,
      email: user.email,
      kind: 'PASSWORD_RESET',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS.PASSWORD_RESET),
    },
  })

  await mailer().send({
    to: user.email,
    subject: '【AI商品開発OS】パスワード再設定',
    text: `以下のリンクからパスワードを再設定してください(1時間有効)。\n\n${env.appUrl}/reset-password?token=${token}\n\nお心当たりがない場合はこのメールを破棄してください。`,
  })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await db.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record || record.kind !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt < new Date() || !record.userId) {
    throw AppError.validation('リンクが無効か、有効期限が切れています')
  }

  await db.$transaction([
    db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    // 再設定時は既存セッションを全て失効させる。
    db.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])

  const user = await db.user.findUnique({ where: { id: record.userId }, select: { id: true } })
  if (user) {
    const membership = await db.organizationMember.findFirst({ where: { userId: user.id } })
    if (membership) {
      await recordAudit({
        organizationId: membership.organizationId,
        userId: user.id,
        action: 'auth.password_reset',
        entityType: 'User',
        entityId: user.id,
      })
    }
  }
}

// ── Google OAuth 2.0(要件6)───────────────────────────────────────────
// Providerライブラリを挟まず、認可コードフローを直接実装している。
// 秘密情報はサーバー側のみで扱う(要件110)。

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export function isGoogleEnabled(): boolean {
  return env.google.clientId.length > 0 && env.google.clientSecret.length > 0
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: `${env.appUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

type GoogleProfile = { sub: string; email?: string; name?: string; picture?: string; email_verified?: boolean }

export async function handleGoogleCallback(
  code: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ id: string; email: string }> {
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: `${env.appUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenResponse.ok) throw new AppError('PROVIDER_ERROR', 'Googleとの認証に失敗しました')

  const tokens = (await tokenResponse.json()) as { access_token?: string }
  if (!tokens.access_token) throw new AppError('PROVIDER_ERROR', 'Googleからトークンを取得できませんでした')

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileResponse.ok) throw new AppError('PROVIDER_ERROR', 'Googleのプロフィール取得に失敗しました')

  const profile = (await profileResponse.json()) as GoogleProfile
  if (!profile.email) throw AppError.validation('Googleアカウントにメールアドレスがありません')

  const email = profile.email.toLowerCase()
  const account = await db.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId: profile.sub } },
    include: { user: true },
  })

  if (account) {
    await createSession(account.userId, meta)
    return { id: account.userId, email: account.user.email }
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    // 既存アカウントへの自動リンクは、Google側でメール所有が確認済みの場合のみ許可する。
    // (未確認メールでのリンクを許すと、同一メール名義のGoogle IDによる乗っ取りが可能になる)
    if (!profile.email_verified) {
      throw AppError.forbidden(
        'このメールアドレスは既に登録されています。メールアドレスとパスワードでログインしてください。',
      )
    }
    await db.oAuthAccount.create({
      data: { userId: existing.id, provider: 'google', providerAccountId: profile.sub },
    })
    if (!existing.emailVerifiedAt) {
      await db.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: new Date() } })
    }
    await createSession(existing.id, meta)
    return { id: existing.id, email: existing.email }
  }

  const user = await db.user.create({
    data: {
      email,
      name: profile.name ?? null,
      image: profile.picture ?? null,
      emailVerifiedAt: profile.email_verified ? new Date() : null,
      accounts: { create: { provider: 'google', providerAccountId: profile.sub } },
    },
  })

  await createOrganization({ name: `${profile.name ?? email.split('@')[0]} の組織`, ownerId: user.id })
  await createSession(user.id, meta)
  return { id: user.id, email: user.email }
}
