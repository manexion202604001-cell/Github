import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { emailSchema } from '@/validators/common'
import { requireOrganization } from '@/server/authz'
import {
  inviteMember,
  listMembers,
  listPendingInvites,
  removeMember,
  updateMemberRole,
} from '@/features/organizations/service'

export const GET = apiHandler(async () => {
  const context = await requireOrganization()
  const [members, invites] = await Promise.all([
    listMembers(context.organizationId),
    listPendingInvites(context.organizationId),
  ])
  return jsonOk({ members, invites, myRole: context.role })
})

const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
})

export const POST = apiHandler(
  async (request: NextRequest) => {
    const context = await requireOrganization()
    const input = await parseBody(request, inviteSchema)
    await inviteMember({ organizationId: context.organizationId, ...input })
    return jsonOk({ invited: true }, { status: 201 })
  },
  { rateLimit: { limit: 20, windowMs: 60 * 60 * 1000 } },
)

const roleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']),
})

export const PATCH = apiHandler(async (request: NextRequest) => {
  const context = await requireOrganization()
  const input = await parseBody(request, roleSchema)
  await updateMemberRole({ organizationId: context.organizationId, ...input })
  return jsonOk({ updated: true })
})

export const DELETE = apiHandler(async (request: NextRequest) => {
  const context = await requireOrganization()
  const memberId = z.string().min(1).parse(new URL(request.url).searchParams.get('memberId'))
  await removeMember(context.organizationId, memberId)
  return jsonOk({ removed: true })
})
