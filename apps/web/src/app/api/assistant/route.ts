import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { ask } from '@/features/assistant/service'

const schema = z.object({
  projectId: z.string().min(1),
  conversationId: z.string().optional(),
  screen: z.string().max(60).default('overview'),
  message: z.string().trim().min(1).max(4000),
})

/** AI Assistant(要件78〜80)。Project Contextはサーバー側で注入される。 */
export const POST = apiHandler(
  async (request) => {
    const input = await parseBody(request, schema)
    return jsonOk(await ask(input))
  },
  { rateLimit: { limit: 30, windowMs: 60_000 } },
)
