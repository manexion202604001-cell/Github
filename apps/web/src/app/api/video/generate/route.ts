import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { cancelVideoJob, generateScene } from '@/features/video/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 60


const schema = z.object({ projectId: z.string().min(1), sceneId: z.string().min(1) })

/** シーン単位の動画生成(要件64, 67)。 */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = await generateScene(input.projectId, input.sceneId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})

const cancelSchema = z.object({ projectId: z.string().min(1), videoJobId: z.string().min(1) })

export const DELETE = apiHandler(async (request) => {
  const input = await parseBody(request, cancelSchema)
  await cancelVideoJob(input.projectId, input.videoJobId)
  return jsonOk({ ok: true })
})
