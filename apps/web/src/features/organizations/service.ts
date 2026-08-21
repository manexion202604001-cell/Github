import 'server-only'
import type { MemberRole } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/server/audit'
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
