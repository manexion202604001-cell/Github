import { z } from 'zod'
import { apiHandler, jsonOk, parseBody, requestMeta } from '@/server/api'
import { emailSchema } from '@/validators/common'
import { login } from '@/features/auth/service'

const schema = z.object({ email: emailSchema, password: z.string().min(1).max(200) })

export const POST = apiHandler(
  async (request) => {
    const input = await parseBody(request, schema)
    const user = await login(input, requestMeta(request))
    return jsonOk(user)
  },
  { rateLimit: { limit: 15, windowMs: 60_000 } },
)
