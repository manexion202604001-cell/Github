import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { generateAngles } from '@/features/images/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 300


const schema = z.object({ projectId: z.string().min(1) })

/** アンカー画像から8方向を生成する(要件17)。 */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = await generateAngles(input.projectId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})
