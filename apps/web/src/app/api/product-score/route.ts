import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import { getLatestScore, startScoring } from '@/features/scoring/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 60


const schema = z.object({ projectId: z.string().min(1) })

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job = await startScoring(input.projectId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await getLatestScore(projectId))
})
