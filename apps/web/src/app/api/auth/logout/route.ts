import { apiHandler, jsonOk } from '@/server/api'
import { destroySession } from '@/server/auth/session'

export const POST = apiHandler(async () => {
  await destroySession()
  return jsonOk({ ok: true })
})
