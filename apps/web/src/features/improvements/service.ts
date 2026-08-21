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
