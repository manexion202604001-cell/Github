import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import { listSamples, saveSample, startSampleEvaluation } from '@/features/samples/service'
import { optionalString } from '@/validators/common'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 300


const score = z.number().int().min(0).max(10).nullable()

const saveSchema = z.object({
  projectId: z.string().min(1),
  id: z.string().optional(),
  round: z.number().int().min(1).max(50),
  supplierName: optionalString(160),
  comment: optionalString(4000),
  mediaUrls: z.array(z.string().max(1000)).max(30).optional(),
  scores: z.object({
    design: score.optional(),
    texture: score.optional(),
    weight: score.optional(),
    size: score.optional(),
    durability: score.optional(),
    usability: score.optional(),
    cleanability: score.optional(),
    packaging: score.optional(),
    competitiveness: score.optional(),
  }),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, saveSchema)
  return jsonOk(await saveSample(input.projectId, input))
})

const evaluateSchema = z.object({ projectId: z.string().min(1), sampleId: z.string().min(1) })

/** AIによるサンプル評価(要件50)。 */
export const PUT = apiHandler(async (request) => {
  const input = await parseBody(request, evaluateSchema)
  const job = await startSampleEvaluation(input.projectId, input.sampleId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await listSamples(projectId))
})
