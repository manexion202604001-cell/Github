import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'

/** サンプル評価項目(要件49)。各10点。 */
export const SAMPLE_CRITERIA = [
  { key: 'design', label: 'デザイン' },
  { key: 'texture', label: '質感' },
  { key: 'weight', label: '重量' },
  { key: 'size', label: 'サイズ' },
  { key: 'durability', label: '耐久性' },
  { key: 'usability', label: '使用感' },
  { key: 'cleanability', label: '清掃性' },
  { key: 'packaging', label: '梱包' },
  { key: 'competitiveness', label: '競合比較' },
] as const

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
