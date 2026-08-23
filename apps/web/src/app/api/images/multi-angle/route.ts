import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { generateAngles, generateSingleAngle } from '@/features/images/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 300


const schema = z.object({
  projectId: z.string().min(1),
  /** 指定時はその角度だけを再生成する(失敗・不満のある角度のリトライ用)。 */
  angle: z.string().optional(),
})

/** アンカー画像から8方向を生成する(要件17)。angle指定で1方向のみ再生成。 */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = input.angle
    ? await generateSingleAngle(input.projectId, input.angle)
    : await generateAngles(input.projectId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})
