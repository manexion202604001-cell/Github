import { z } from 'zod'
import { apiHandler, jsonOk, parseBody, requestMeta } from '@/server/api'
import { emailSchema, passwordSchema } from '@/validators/common'
import { signup } from '@/features/auth/service'

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(80).optional(),
  organizationName: z.string().trim().max(120).optional(),
})

export const POST = apiHandler(
  async (request) => {
    const input = await parseBody(request, schema)
    const user = await signup(input, requestMeta(request))
    return jsonOk(user, { status: 201 })
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
)
