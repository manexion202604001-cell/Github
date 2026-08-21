import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import {
  getCurrentSpecification,
  startOEMDocument,
  startSpecificationGeneration,
} from '@/features/specifications/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 60

const schema = z.object({
  projectId: z.string().min(1),
  /** 'spec' = 商品仕様生成 / 'oem-document' = OEM仕様書 / 'revision' = 次回ロット修正依頼書 */
  action: z.enum(['spec', 'oem-document', 'revision']).default('spec'),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const job =
    input.action === 'spec'
      ? await startSpecificationGeneration(input.projectId)
      : await startOEMDocument(input.projectId, input.action === 'revision' ? 'REVISION_REQUEST' : 'SPECIFICATION')
  return jsonOk({ jobId: job.id }, { status: 202 })
})

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await getCurrentSpecification(projectId))
})
