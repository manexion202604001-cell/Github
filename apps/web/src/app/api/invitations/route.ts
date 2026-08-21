import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { acceptInvite } from '@/features/organizations/service'

export const POST = apiHandler(async (request: NextRequest) => {
  const { token } = await parseBody(request, z.object({ token: z.string().min(8) }))
  return jsonOk(await acceptInvite(token))
})
