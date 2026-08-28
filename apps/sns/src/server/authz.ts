import 'server-only'
import { cache } from 'react'
import type { MemberRole } from '@/generated/prisma'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { getCurrentUser, type SessionUser } from '@/server/auth/session'
import { roleAtLeast } from '@/features/organizations/domain'

export { roleAtLeast }

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
 * 所属組織のコンテキストを返す。すべての service 関数の入口で必ず呼ぶ。
 * 組織をまたいだ参照はここで遮断される(要件66)。
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

export async function requireOrganizationRole(minRole: MemberRole, organizationId?: string): Promise<AuthContext> {
  const context = await requireOrganization(organizationId)
  if (!roleAtLeast(context.role, minRole)) throw AppError.forbidden()
  return context
}

/**
 * ブランドへのアクセスを検証する。ブランド配下のデータ(調査・企画・台本)は
 * すべてこの関数を通してから読み書きする。
 * 権限が無い場合は存在の有無を漏らさないため NOT_FOUND を返す。
 */
export const requireBrandAccess = cache(
  async (brandId: string, minRole: MemberRole = 'VIEWER'): Promise<AuthContext & { brandId: string }> => {
    const user = await requireUser()
    const brand = await db.brand.findFirst({
      where: { id: brandId, deletedAt: null },
      select: { id: true, organizationId: true },
    })
    if (!brand) throw AppError.notFound('ブランドが見つかりません')

    const membership = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: brand.organizationId, userId: user.id } },
    })
    if (!membership || membership.joinedAt === null) throw AppError.notFound('ブランドが見つかりません')
    if (!roleAtLeast(membership.role, minRole)) throw AppError.forbidden()

    return { user, organizationId: brand.organizationId, role: membership.role, brandId: brand.id }
  },
)
