import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { toggleTask } from '@/features/projects/service'

const schema = z.object({ taskId: z.string().min(1), done: z.boolean() })

export const PATCH = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  await toggleTask(input.taskId, input.done)
  return jsonOk({ ok: true })
})
