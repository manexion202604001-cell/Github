import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { editImage } from '@/features/images/service'

const schema = z.object({
  projectId: z.string().min(1),
  imageId: z.string().min(1),
  presetId: z.string().min(1),
  value: z.string().min(1).max(500),
})

/** 画像編集(要件20)。 */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = await editImage(input.projectId, input)
  return jsonOk({ jobId: job.id }, { status: 202 })
})
