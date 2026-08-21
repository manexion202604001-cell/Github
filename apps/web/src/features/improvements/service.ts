import 'server-only'
import type { ImprovementStatus } from '@prisma/client'
import { db } from '@/server/db'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'

export async function listImprovements(projectId: string) {
  await requireProjectAccess(projectId)
  return db.improvement.findMany({
    where: { projectId },
    orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function startImprovementGeneration(projectId: string, phase: 'DESIGN' | 'POST_SALE') {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'improvements.generate',
    payload: { projectId, phase },
    createdBy: context.user.id,
  })
}

export async function updateImprovementStatus(projectId: string, id: string, status: ImprovementStatus) {
  await requireProjectAccess(projectId, 'EDITOR')
  await db.improvement.updateMany({ where: { id, projectId }, data: { status } })
}

export async function startLaunchChecklist(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'improvements.launchChecklist',
    payload: { projectId },
    createdBy: context.user.id,
  })
}

export async function getLaunchChecklist(projectId: string) {
  await requireProjectAccess(projectId)
  return db.projectTask.findMany({
    where: { projectId, stage: 'LAUNCH' },
    orderBy: [{ done: 'asc' }, { order: 'asc' }],
  })
}

export type RelatedProductIdea = { type: string; name: string; reason: string }

/**
 * 次の商品提案(要件76)。
 * 直近の改善生成Jobの結果から取り出す(結果JSONはJobに永続化済み・要件112)。
 */
export async function getRelatedProductIdeas(projectId: string): Promise<RelatedProductIdea[]> {
  await requireProjectAccess(projectId)
  const job = await db.job.findFirst({
    where: { projectId, handler: 'improvements.generate', status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    select: { result: true },
  })
  const result = job?.result
  if (!result || typeof result !== 'object') return []
  const ideas = (result as Record<string, unknown>).relatedProductIdeas
  if (!Array.isArray(ideas)) return []
  return ideas.flatMap((idea) => {
    if (!idea || typeof idea !== 'object') return []
    const record = idea as Record<string, unknown>
    if (typeof record.name !== 'string') return []
    return [
      {
        type: typeof record.type === 'string' ? record.type : '関連商品',
        name: record.name,
        reason: typeof record.reason === 'string' ? record.reason : '',
      },
    ]
  })
}
