import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { runAITask } from '@/server/ai-task'
import { productSpecificationTask } from '@/prompts/product-specification'
import { oemDocumentTask } from '@/prompts/oem-document'
import { buildProjectContext } from '@/features/assistant/context'
import { advanceStage } from '@/features/projects/service'
import { createProductVersion } from '@/features/products/service'
import type { JobHandler } from '@/jobs/types'

const projectPayload = z.object({ projectId: z.string() })

/** STEP 7: 商品仕様を生成し、新しいVersionとして保存する(要件42, 43, 74)。 */
const generateSpecification: JobHandler = async (context) => {
  const { projectId } = projectPayload.parse(context.payload)
  const snapshot = await buildProjectContext(projectId)
  await context.setProgress(25)

  const result = await runAITask(
    productSpecificationTask,
    { context: snapshot },
    { organizationId: context.organizationId, projectId, jobId: context.jobId },
  )
  const spec = result.data
  await context.setProgress(70)

  const latest = await db.productSpecification.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const version = (latest?.version ?? 0) + 1

  const [, created] = await db.$transaction([
    db.productSpecification.updateMany({ where: { projectId }, data: { isCurrent: false } }),
    db.productSpecification.create({
      data: {
        projectId,
        version,
        size: spec.size,
        weight: spec.weight,
        material: spec.material,
        color: spec.color,
        features: spec.features,
        structure: spec.structure,
        power: spec.power,
        accessories: spec.accessories,
        packaging: spec.packaging,
        cautions: spec.cautions,
        qualityStandards: spec.qualityStandards,
        rationale: spec.rationale,
        isCurrent: true,
        rawData: { synthetic: result.synthetic },
      },
    }),
  ])

  const product = await db.product.findUnique({ where: { projectId }, select: { id: true } })
  if (product) {
    await createProductVersion({
      productId: product.id,
      specification: spec,
      changeReason: `商品仕様 v${version} を生成`,
      changedFields: Object.keys(spec),
      expectedEffect: null,
    })
  }

  await advanceStage(projectId, 'PRODUCT_DESIGN')
  return { specificationId: created.id, version, synthetic: result.synthetic }
}

const documentPayload = z.object({
  projectId: z.string(),
  specificationId: z.string(),
  kind: z.enum(['SPECIFICATION', 'REVISION_REQUEST']),
})

/** STEP 8: OEM仕様書 / 次回ロット修正依頼書を生成する(要件44, 45, 75)。 */
const generateOEMDocument: JobHandler = async (context) => {
  const payload = documentPayload.parse(context.payload)
  const snapshot = await buildProjectContext(payload.projectId)
  await context.setProgress(30)

  const result = await runAITask(
    oemDocumentTask,
    { context: snapshot, kind: payload.kind },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )

  const latest = await db.oEMDocument.findFirst({
    where: { specificationId: payload.specificationId, kind: payload.kind },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  const document = await db.oEMDocument.create({
    data: {
      specificationId: payload.specificationId,
      kind: payload.kind,
      version: (latest?.version ?? 0) + 1,
      title: result.data.title,
      content: JSON.parse(JSON.stringify({ ...result.data, synthetic: result.synthetic })),
    },
  })

  await advanceStage(payload.projectId, 'OEM')
  return { documentId: document.id, title: document.title, synthetic: result.synthetic }
}

export const specificationJobHandlers: Record<string, JobHandler> = {
  'specifications.generate': generateSpecification,
  'specifications.oemDocument': generateOEMDocument,
}
