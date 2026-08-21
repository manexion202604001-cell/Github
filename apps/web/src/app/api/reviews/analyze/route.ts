import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { startReviewAnalysis } from '@/features/market-research/service'

const schema = z.object({ projectId: z.string().min(1) })

/** レビュー解析・不満クラスタリング(要件26, 27)。 */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = await startReviewAnalysis(input.projectId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})
