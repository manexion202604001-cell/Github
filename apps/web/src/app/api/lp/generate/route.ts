import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { startLPGeneration } from '@/features/lp/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 60


const schema = z.object({ projectId: z.string().min(1) })

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = await startLPGeneration(input.projectId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})
