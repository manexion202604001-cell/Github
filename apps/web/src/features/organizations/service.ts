import 'server-only'
import type { MemberRole } from '@prisma/client'
import { db } from '@/server/db'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/server/audit'
import { hashToken, randomToken } from '@/server/crypto'
import { mailer } from '@/server/mailer'
import { requireOrganizationRole, requireUser } from '@/server/authz'

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return base || 'org'
}

/** 一意なslugを確保する。 */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`
    const existing = await db.organization.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

export async function createOrganization(input: { name: string; ownerId: string }): Promise<{ id: string }> {
  const slug = await uniqueSlug(input.name)
  const organization = await db.organization.create({
    data: {
      name: input.name,
      slug,
      members: { create: { userId: input.ownerId, role: 'OWNER', joinedAt: new Date() } },
    },
  })

  await recordAudit({
    organizationId: organization.id,
    userId: input.ownerId,
    action: 'organization.create',
    entityType: 'Organization',
    entityId: organization.id,
    summary: `組織「${input.name}」を作成`,
  })

  return { id: organization.id }
}

export async function listMyOrganizations() {
  const user = await requireUser()
  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id, joinedAt: { not: null } },
    include: { organization: true },
    orderBy: { invitedAt: 'asc' },
  })
  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    plan: membership.organization.plan,
    role: membership.role,
  }))
}

export async function listMembers(organizationId: string) {
  await requireOrganizationRole(organizationId, 'VIEWER')
  const members = await db.organizationMember.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, email: true, name: true, image: true } } },
    orderBy: { invitedAt: 'asc' },
  })
  return members.map((member) => ({
    id: member.id,
    role: member.role,
    joinedAt: member.joinedAt,
    user: member.user,
  }))
}

export async function updateMemberRole(input: {
  organizationId: string
  memberId: string
  role: MemberRole
}): Promise<void> {
  const context = await requireOrganizationRole(input.organizationId, 'ADMIN')

  const member = await db.organizationMember.findUnique({ where: { id: input.memberId } })
  if (!member || member.organizationId !== input.organizationId) throw AppError.notFound('メンバーが見つかりません')

  // 最後のOWNERを降格させない。
  if (member.role === 'OWNER' && input.role !== 'OWNER') {
    const owners = await db.organizationMember.count({
      where: { organizationId: input.organizationId, role: 'OWNER' },
    })
    if (owners <= 1) throw AppError.conflict('組織には最低1名のOwnerが必要です')
  }
  if (input.role === 'OWNER' && context.role !== 'OWNER') {
    throw AppError.forbidden('Owner権限の付与はOwnerのみ可能です')
  }

  await db.organizationMember.update({ where: { id: input.memberId }, data: { role: input.role } })
  await recordAudit({
    organizationId: input.organizationId,
    userId: context.user.id,
    action: 'organization.member.role_change',
    entityType: 'OrganizationMember',
    entityId: input.memberId,
    summary: `権限を ${member.role} → ${input.role} に変更`,
  })
}

export async function getUsageSummary(organizationId: string) {
  await requireOrganizationRole(organizationId, 'VIEWER')
  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
  const record = await db.usageRecord.findUnique({
    where: { organizationId_period: { organizationId, period } },
  })
  return {
    period,
    imageGenerationCount: record?.imageGenerationCount ?? 0,
    marketResearchCount: record?.marketResearchCount ?? 0,
    videoGenerationCount: record?.videoGenerationCount ?? 0,
    llmInputTokens: record?.llmInputTokens ?? 0,
    llmOutputTokens: record?.llmOutputTokens ?? 0,
    estimatedCostMicro: record?.estimatedCostMicro ?? 0,
  }
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** メンバー招待(要件7)。招待リンクをメールで送る。 */
export async function inviteMember(input: {
  organizationId: string
  email: string
  role: Exclude<MemberRole, 'OWNER'>
}): Promise<void> {
  const context = await requireOrganizationRole(input.organizationId, 'ADMIN')
  const email = input.email.toLowerCase().trim()

  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existingUser) {
    const membership = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: input.organizationId, userId: existingUser.id } },
    })
    if (membership?.joinedAt) throw AppError.conflict('このユーザーは既にメンバーです')
  }

  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  })

  const token = randomToken()
  await db.verificationToken.create({
    data: {
      email,
      kind: 'ORGANIZATION_INVITE',
      tokenHash: hashToken(token),
      payload: { organizationId: input.organizationId, role: input.role },
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  })

  await mailer().send({
    to: email,
    subject: `【UCCHAU】${organization?.name ?? '組織'} への招待`,
    text: `${organization?.name ?? '組織'} のメンバーに招待されました。\n以下のリンクから参加してください(7日間有効)。\n\n${env.appUrl}/invite?token=${token}\n\nアカウントをお持ちでない場合は、このメールアドレスで新規登録してから再度リンクを開いてください。`,
  })

  await recordAudit({
    organizationId: input.organizationId,
    userId: context.user.id,
    action: 'organization.member.invite',
    entityType: 'Organization',
    entityId: input.organizationId,
    summary: `${email} を ${input.role} として招待`,
  })
}

/** 招待の未承認一覧。 */
export async function listPendingInvites(organizationId: string) {
  await requireOrganizationRole(organizationId, 'VIEWER')
  const tokens = await db.verificationToken.findMany({
    where: {
      kind: 'ORGANIZATION_INVITE',
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return tokens
    .filter((row) => {
      const payload = row.payload as { organizationId?: string } | null
      return payload?.organizationId === organizationId
    })
    .map((row) => ({
      email: row.email,
      role: ((row.payload as { role?: string } | null)?.role ?? 'EDITOR') as MemberRole,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    }))
}

/** 招待の内容を取得(承認画面の表示用)。 */
export async function previewInvite(token: string) {
  const row = await db.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!row || row.kind !== 'ORGANIZATION_INVITE' || row.usedAt || row.expiresAt < new Date()) {
    throw AppError.validation('招待リンクが無効か、有効期限が切れています')
  }
  const payload = row.payload as { organizationId?: string; role?: MemberRole } | null
  if (!payload?.organizationId) throw AppError.validation('招待リンクが不正です')

  const organization = await db.organization.findUnique({
    where: { id: payload.organizationId },
    select: { name: true },
  })
  return {
    email: row.email,
    organizationName: organization?.name ?? '(不明な組織)',
    role: payload.role ?? 'EDITOR',
  }
}

/** 招待の承認。ログイン中のユーザーのメールと招待先が一致する場合のみ。 */
export async function acceptInvite(token: string): Promise<{ organizationId: string }> {
  const user = await requireUser()
  const row = await db.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!row || row.kind !== 'ORGANIZATION_INVITE' || row.usedAt || row.expiresAt < new Date()) {
    throw AppError.validation('招待リンクが無効か、有効期限が切れています')
  }
  if (row.email.toLowerCase() !== user.email.toLowerCase()) {
    throw AppError.forbidden(
      `この招待は ${row.email} 宛です。招待されたメールアドレスのアカウントでログインしてください。`,
    )
  }
  const payload = row.payload as { organizationId?: string; role?: MemberRole } | null
  if (!payload?.organizationId) throw AppError.validation('招待リンクが不正です')
  const role: MemberRole = payload.role && payload.role !== 'OWNER' ? payload.role : 'EDITOR'

  await db.$transaction([
    db.verificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: payload.organizationId, userId: user.id } },
      create: { organizationId: payload.organizationId, userId: user.id, role, joinedAt: new Date() },
      update: { role, joinedAt: new Date() },
    }),
  ])

  await recordAudit({
    organizationId: payload.organizationId,
    userId: user.id,
    action: 'organization.member.join',
    entityType: 'Organization',
    entityId: payload.organizationId,
    summary: `${user.email} が参加`,
  })

  return { organizationId: payload.organizationId }
}

/** メンバー削除。最後のOwnerは削除できない。 */
export async function removeMember(organizationId: string, memberId: string): Promise<void> {
  const context = await requireOrganizationRole(organizationId, 'ADMIN')
  const member = await db.organizationMember.findUnique({ where: { id: memberId } })
  if (!member || member.organizationId !== organizationId) throw AppError.notFound('メンバーが見つかりません')

  if (member.role === 'OWNER') {
    if (context.role !== 'OWNER') throw AppError.forbidden('Ownerを削除できるのはOwnerのみです')
    const owners = await db.organizationMember.count({ where: { organizationId, role: 'OWNER' } })
    if (owners <= 1) throw AppError.conflict('組織には最低1名のOwnerが必要です')
  }

  await db.organizationMember.delete({ where: { id: memberId } })
  await recordAudit({
    organizationId,
    userId: context.user.id,
    action: 'organization.member.remove',
    entityType: 'OrganizationMember',
    entityId: memberId,
    summary: 'メンバーを削除',
  })
}

/** 直近のAI利用履歴(利用量画面用)。 */
export async function listRecentAIJobs(organizationId: string, limit = 20) {
  await requireOrganizationRole(organizationId, 'VIEWER')
  return db.aIJob.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      purpose: true,
      provider: true,
      model: true,
      status: true,
      inputTokens: true,
      outputTokens: true,
      imageCount: true,
      videoSeconds: true,
      estimatedCostMicro: true,
      createdAt: true,
    },
  })
}

/** 監査ログの閲覧(要件113)。Admin以上。 */
export async function listAuditLogs(organizationId: string, limit = 50) {
  await requireOrganizationRole(organizationId, 'ADMIN')
  const logs = await db.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  })
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    summary: log.summary,
    actor: log.user?.name ?? log.user?.email ?? 'システム',
    createdAt: log.createdAt,
  }))
}
