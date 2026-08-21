import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'

export { SAMPLE_CRITERIA } from './constants'
import { SAMPLE_CRITERIA } from './constants'

export type SampleScores = Partial<Record<(typeof SAMPLE_CRITERIA)[number]['key'], number | null>>

export async function listSamples(projectId: string) {
  await requireProjectAccess(projectId)
  return db.sampleEvaluation.findMany({ where: { projectId }, orderBy: { round: 'desc' } })
}

export async function saveSample(
  projectId: string,
  input: { id?: string; round: number; supplierName?: string | null; scores: SampleScores; comment?: string | null; mediaUrls?: string[] },
) {
  await requireProjectAccess(projectId, 'EDITOR')

  const data = {
    projectId,
    round: input.round,
    supplierName: input.supplierName ?? null,
    comment: input.comment ?? null,
    mediaUrls: input.mediaUrls ?? [],
    design: input.scores.design ?? null,
    texture: input.scores.texture ?? null,
    weight: input.scores.weight ?? null,
    size: input.scores.size ?? null,
    durability: input.scores.durability ?? null,
    usability: input.scores.usability ?? null,
    cleanability: input.scores.cleanability ?? null,
    packaging: input.scores.packaging ?? null,
    competitiveness: input.scores.competitiveness ?? null,
  }

  if (input.id) {
    const existing = await db.sampleEvaluation.findUnique({ where: { id: input.id } })
    if (!existing || existing.projectId !== projectId) throw AppError.notFound('サンプル評価が見つかりません')
    return db.sampleEvaluation.update({ where: { id: input.id }, data })
  }

  return db.sampleEvaluation.create({ data })
}

export async function startSampleEvaluation(projectId: string, sampleId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const sample = await db.sampleEvaluation.findUnique({ where: { id: sampleId } })
  if (!sample || sample.projectId !== projectId) throw AppError.notFound('サンプル評価が見つかりません')

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'samples.evaluate',
    payload: { projectId, sampleId },
    createdBy: context.user.id,
  })
}
