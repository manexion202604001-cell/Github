import 'server-only'
import { cache } from 'react'
import type { MemberRole } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { getCurrentUser, type SessionUser } from '@/server/auth/session'

/** 権限の強さ。数値が大きいほど強い(要件7)。 */
const ROLE_RANK: Record<MemberRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
}

export function roleAtLeast(role: MemberRole, required: MemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required]
}

export type AuthContext = {
  user: SessionUser
  organizationId: string
  role: MemberRole
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw AppError.unauthorized()
  return user
}

/**
 * 所属Organizationのうち、指定がなければ最初の1件を返す。
 * 同一リクエスト内で複数のservice関数から重複して呼ばれるため、
 * React.cache でリクエスト単位にメモ化する(重複クエリを防ぐ)。
 */
export const requireOrganization = cache(async (organizationId?: string): Promise<AuthContext> => {
  const user = await requireUser()
  const membership = await db.organizationMember.findFirst({
    where: {
      userId: user.id,
      joinedAt: { not: null },
      ...(organizationId ? { organizationId } : {}),
    },
    orderBy: { invitedAt: 'asc' },
  })
  if (!membership) throw AppError.forbidden('組織へのアクセス権がありません')
  return { user, organizationId: membership.organizationId, role: membership.role }
})

/**
 * プロジェクトへのアクセスを検証する。すべての service 層の入口で必ず呼ぶ。
 * Organization をまたいだ参照はここで遮断される(要件110)。
 *
 * layout・page・複数のservice関数が同じ (projectId, minRole) の組み合わせで
 * 同一リクエスト内から繰り返し呼ぶため、React.cache でメモ化する。
 */
export const requireProjectAccess = cache(
  async (projectId: string, minRole: MemberRole = 'VIEWER'): Promise<AuthContext & { projectId: string }> => {
    const user = await requireUser()
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    })
    if (!project) throw AppError.notFound('プロジェクトが見つかりません')

    const membership = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: project.organizationId, userId: user.id } },
    })
    if (!membership || membership.joinedAt === null) throw AppError.notFound('プロジェクトが見つかりません')
    if (!roleAtLeast(membership.role, minRole)) throw AppError.forbidden()

    return { user, organizationId: project.organizationId, role: membership.role, projectId: project.id }
  },
)

export async function requireOrganizationRole(
  organizationId: string,
  minRole: MemberRole,
): Promise<AuthContext> {
  const context = await requireOrganization(organizationId)
  if (!roleAtLeast(context.role, minRole)) throw AppError.forbidden()
  return context
}
