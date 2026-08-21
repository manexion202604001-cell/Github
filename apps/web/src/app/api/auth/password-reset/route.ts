import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { emailSchema, passwordSchema } from '@/validators/common'
import { requestPasswordReset, resetPassword } from '@/features/auth/service'

const requestSchema = z.object({ email: emailSchema })
const confirmSchema = z.object({ token: z.string().min(10), password: passwordSchema })

/** POST: リセットメール送信要求 / PUT: 新パスワード確定 */
export const POST = apiHandler(
  async (request) => {
    const input = await parseBody(request, requestSchema)
    await requestPasswordReset(input.email)
    return jsonOk({ ok: true })
  },
  { rateLimit: { limit: 5, windowMs: 60_000 } },
)

export const PUT = apiHandler(
  async (request) => {
    const input = await parseBody(request, confirmSchema)
    await resetPassword(input.token, input.password)
    return jsonOk({ ok: true })
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
)
