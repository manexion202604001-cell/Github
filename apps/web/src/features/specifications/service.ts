import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'

export async function startSpecificationGeneration(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'specifications.generate',
    payload: { projectId },
    createdBy: context.user.id,
  })
}

export async function getCurrentSpecification(projectId: string) {
  await requireProjectAccess(projectId)
  return db.productSpecification.findFirst({
    where: { projectId, isCurrent: true },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
  })
}

export async function listSpecifications(projectId: string) {
  await requireProjectAccess(projectId)
  return db.productSpecification.findMany({ where: { projectId }, orderBy: { version: 'desc' } })
}

export async function startOEMDocument(projectId: string, kind: 'SPECIFICATION' | 'REVISION_REQUEST') {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const specification = await db.productSpecification.findFirst({ where: { projectId, isCurrent: true } })
  if (!specification) throw AppError.validation('先に商品仕様を作成してください')

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'DOCUMENT',
    handler: 'specifications.oemDocument',
    payload: { projectId, specificationId: specification.id, kind },
    createdBy: context.user.id,
  })
}

export async function getOEMDocument(documentId: string) {
  const document = await db.oEMDocument.findUnique({
    where: { id: documentId },
    include: { specification: { select: { projectId: true } } },
  })
  if (!document) throw AppError.notFound('仕様書が見つかりません')
  await requireProjectAccess(document.specification.projectId)
  return document
}
