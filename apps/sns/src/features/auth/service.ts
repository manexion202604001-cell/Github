import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { hashPassword, verifyPassword } from '@/server/auth/password'
import { createSession, destroySession } from '@/server/auth/session'
import { recordAudit } from '@/server/audit'
import { slugify } from '@/features/organizations/domain'
import type { LoginInput, SignupInput } from '@/lib/validation/auth'

/**
 * 新規登録。同時に組織を作り、作成者を OWNER にする(要件8)。
 * 1ユーザーが複数組織に所属できる構造は維持する。
 */
export async function signup(input: SignupInput, meta: { userAgent?: string | null; ip?: string | null }): Promise<void> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } })
  if (existing) {
    throw AppError.conflict('このメールアドレスは既に登録されています', 'ログインページからサインインしてください。')
  }

  const passwordHash = await hashPassword(input.password)

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    })

    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug: await uniqueSlug(tx, slugify(input.organizationName)),
        createdById: created.id,
      },
    })

    await tx.organizationMember.create({
      data: { organizationId: organization.id, userId: created.id, role: 'OWNER', joinedAt: new Date() },
    })

    return { ...created, organizationId: organization.id }
  })

  await createSession(user.id, meta)
  await recordAudit({
    organizationId: user.organizationId,
    userId: user.id,
    action: 'organization.create',
    entityType: 'organization',
    entityId: user.organizationId,
    summary: `${input.organizationName} を作成`,
  })
}

export async function login(input: LoginInput, meta: { userAgent?: string | null; ip?: string | null }): Promise<void> {
  const user = await db.user.findUnique({ where: { email: input.email } })
  // ユーザーの存在有無を漏らさないため、失敗時のメッセージは共通にする。
  const valid = await verifyPassword(input.password, user?.passwordHash ?? null)
  if (!user || !valid) {
    throw new AppError('UNAUTHORIZED', 'メールアドレスまたはパスワードが違います', {
      hint: '入力内容をご確認ください。',
    })
  }
  await createSession(user.id, meta)
}

export async function logout(): Promise<void> {
  await destroySession()
}

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0]

async function uniqueSlug(tx: TransactionClient, base: string): Promise<string> {
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`
    const taken = await tx.organization.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!taken) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}
