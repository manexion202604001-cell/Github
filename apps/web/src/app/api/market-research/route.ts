import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import { getLatestResearch, startMarketResearch } from '@/features/market-research/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 300


const schema = z.object({
  projectId: z.string().min(1),
  keyword: z.string().max(120).optional(),
  marketplace: z.string().max(120).optional(),
  depth: z.enum(['QUICK', 'STANDARD', 'DEEP']).optional(),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const { research, job } = await startMarketResearch(input.projectId, input)
  return jsonOk({ researchId: research.id, jobId: job.id }, { status: 202 })
})

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await getLatestResearch(projectId))
})
