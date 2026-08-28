import 'server-only'
import type { MemberRole } from '@/generated/prisma'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireOrganization, requireOrganizationRole } from '@/server/authz'
import { recordAudit } from '@/server/audit'
import { roleAtLeast } from './domain'

export type OrganizationSummary = {
  id: string
  name: string
  slug: string
  aiProvider: string | null
  role: MemberRole
  memberCount: number
}

export async function getCurrentOrganization(organizationId?: string): Promise<OrganizationSummary> {
  const context = await requireOrganization(organizationId)
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: context.organizationId },
    select: { id: true, name: true, slug: true, aiProvider: true, _count: { select: { members: true } } },
  })
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    aiProvider: organization.aiProvider,
    role: context.role,
    memberCount: organization._count.members,
  }
}

export async function listMembers() {
  const context = await requireOrganization()
  const members = await db.organizationMember.findMany({
    where: { organizationId: context.organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ role: 'desc' }, { invitedAt: 'asc' }],
  })
  return { members, viewerRole: context.role, viewerId: context.user.id }
}

export async function updateOrganization(input: { name: string; aiProvider: string | null }): Promise<void> {
  const context = await requireOrganizationRole('ADMIN')
  await db.organization.update({
    where: { id: context.organizationId },
    data: { name: input.name, aiProvider: input.aiProvider },
  })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'organization.update',
    entityType: 'organization',
    entityId: context.organizationId,
    summary: `組織設定を更新(${input.name})`,
  })
}

/**
 * メンバーを招待する。既存ユーザーのみ即時参加、未登録なら招待レコードだけ作る。
 * 自分より強い権限は付与できない。
 */
export async function inviteMember(input: { email: string; role: MemberRole }): Promise<{ pending: boolean }> {
  const context = await requireOrganizationRole('ADMIN')
  if (!roleAtLeast(context.role, input.role)) {
    throw AppError.forbidden('自分より上位の権限は付与できません')
  }

  const user = await db.user.findUnique({ where: { email: input.email }, select: { id: true } })
  if (!user) {
    throw AppError.notFound('このメールアドレスのユーザーはまだ登録されていません')
  }

  const existing = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: context.organizationId, userId: user.id } },
  })
  if (existing) throw AppError.conflict('このユーザーは既にメンバーです')

  await db.organizationMember.create({
    data: { organizationId: context.organizationId, userId: user.id, role: input.role, joinedAt: new Date() },
  })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'member.invite',
    entityType: 'organization_member',
    entityId: user.id,
    summary: `${input.email} を ${input.role} として追加`,
  })
  return { pending: false }
}

export async function changeMemberRole(input: { memberId: string; role: MemberRole }): Promise<void> {
  const context = await requireOrganizationRole('ADMIN')
  const member = await db.organizationMember.findFirst({
    where: { id: input.memberId, organizationId: context.organizationId },
    include: { user: { select: { email: true } } },
  })
  if (!member) throw AppError.notFound('メンバーが見つかりません')
  if (member.userId === context.user.id) throw AppError.forbidden('自分の権限は変更できません')
  if (!roleAtLeast(context.role, member.role) || !roleAtLeast(context.role, input.role)) {
    throw AppError.forbidden('自分より上位の権限は変更できません')
  }
  // OWNER が0人になる状態は作らせない。
  if (member.role === 'OWNER') {
    const owners = await db.organizationMember.count({
      where: { organizationId: context.organizationId, role: 'OWNER' },
    })
    if (owners <= 1) throw AppError.conflict('Owner は最低1人必要です')
  }

  await db.organizationMember.update({ where: { id: member.id }, data: { role: input.role } })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'member.role_change',
    entityType: 'organization_member',
    entityId: member.id,
    summary: `${member.user.email} の権限を ${member.role} → ${input.role} へ変更`,
  })
}

export async function removeMember(memberId: string): Promise<void> {
  const context = await requireOrganizationRole('ADMIN')
  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: context.organizationId },
    include: { user: { select: { email: true } } },
  })
  if (!member) throw AppError.notFound('メンバーが見つかりません')
  if (member.userId === context.user.id) throw AppError.forbidden('自分自身は削除できません')
  if (!roleAtLeast(context.role, member.role)) throw AppError.forbidden('自分より上位の権限は削除できません')
  if (member.role === 'OWNER') {
    const owners = await db.organizationMember.count({
      where: { organizationId: context.organizationId, role: 'OWNER' },
    })
    if (owners <= 1) throw AppError.conflict('Owner は最低1人必要です')
  }

  await db.organizationMember.delete({ where: { id: member.id } })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'member.remove',
    entityType: 'organization_member',
    entityId: member.id,
    summary: `${member.user.email} を削除`,
  })
}

export async function updateProfile(input: { name: string; jobTitle: string | null }): Promise<void> {
  const context = await requireOrganization()
  await db.user.update({ where: { id: context.user.id }, data: { name: input.name, jobTitle: input.jobTitle } })
}

export async function listAuditLogs(limit = 50) {
  const context = await requireOrganizationRole('ADMIN')
  return db.auditLog.findMany({
    where: { organizationId: context.organizationId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function usageSummary() {
  const context = await requireOrganization()
  const since = new Date()
  since.setMonth(since.getMonth() - 1)

  const logs = await db.aiUsageLog.groupBy({
    by: ['feature'],
    where: { organizationId: context.organizationId, createdAt: { gte: since } },
    _sum: { inputTokens: true, outputTokens: true, estimatedCostMicro: true },
    _count: { _all: true },
  })

  return logs
    .map((log) => ({
      feature: log.feature,
      calls: log._count._all,
      inputTokens: log._sum.inputTokens ?? 0,
      outputTokens: log._sum.outputTokens ?? 0,
      estimatedCostMicro: log._sum.estimatedCostMicro ?? 0,
    }))
    .sort((a, b) => b.calls - a.calls)
}
