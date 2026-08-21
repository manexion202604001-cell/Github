import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import {
  listImprovements,
  startImprovementGeneration,
  startLaunchChecklist,
  updateImprovementStatus,
} from '@/features/improvements/service'

const generateSchema = z.object({
  projectId: z.string().min(1),
  phase: z.enum(['DESIGN', 'POST_SALE']).default('DESIGN'),
  /** true なら販売前チェックリスト生成(要件69)。 */
  checklist: z.boolean().default(false),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, generateSchema)
  const job = input.checklist
    ? await startLaunchChecklist(input.projectId)
    : await startImprovementGeneration(input.projectId, input.phase)
  return jsonOk({ jobId: job.id }, { status: 202 })
})

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await listImprovements(projectId))
})

const statusSchema = z.object({
  projectId: z.string().min(1),
  id: z.string().min(1),
  status: z.enum(['PROPOSED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'REJECTED']),
})

export const PATCH = apiHandler(async (request) => {
  const input = await parseBody(request, statusSchema)
  await updateImprovementStatus(input.projectId, input.id, input.status)
  return jsonOk({ ok: true })
})
