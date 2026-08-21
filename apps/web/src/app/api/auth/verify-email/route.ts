import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { verifyEmail } from '@/features/auth/service'

const schema = z.object({ token: z.string().min(10) })

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  await verifyEmail(input.token)
  return jsonOk({ ok: true })
})
