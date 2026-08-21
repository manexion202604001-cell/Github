import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { generateConcepts, generatePreset, selectAnchor } from '@/features/images/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 60


const schema = z.object({
  projectId: z.string().min(1),
  /** 省略時はコンセプト3案。指定時は画像種類プリセット(要件19)。 */
  presetId: z.string().optional(),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = input.presetId
    ? await generatePreset(input.projectId, input.presetId)
    : await generateConcepts(input.projectId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})

const anchorSchema = z.object({ projectId: z.string().min(1), imageId: z.string().min(1) })

/** アンカー画像の選択(要件16)。 */
export const PUT = apiHandler(async (request) => {
  const input = await parseBody(request, anchorSchema)
  await selectAnchor(input.projectId, input.imageId)
  return jsonOk({ ok: true })
})
