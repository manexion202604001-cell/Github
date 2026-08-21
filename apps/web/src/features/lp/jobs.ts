import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { runAITask } from '@/server/ai-task'
import { lpGenerationTask } from '@/prompts/lp-generation'
import { buildProjectContext } from '@/features/assistant/context'
import { advanceStage } from '@/features/projects/service'
import type { JobHandler } from '@/jobs/types'

const payloadSchema = z.object({ projectId: z.string() })

/** STEP 10: LPを生成する。過去のVersionは残す(要件51〜55, 112)。 */
const generate: JobHandler = async (context) => {
  const { projectId } = payloadSchema.parse(context.payload)
  const snapshot = await buildProjectContext(projectId)
  await context.setProgress(25)

  const result = await runAITask(
    lpGenerationTask,
    { context: snapshot },
    { organizationId: context.organizationId, projectId, jobId: context.jobId },
  )
  await context.setProgress(70)

  // セクションに割り当てる画像候補。アンカー・角度画像を順に使う。
  const product = await db.product.findUnique({
    where: { projectId },
    include: {
      images: {
        where: { type: { in: ['ANCHOR', 'ANGLE', 'LIFESTYLE', 'LP', 'CONCEPT'] } },
        orderBy: [{ isAnchor: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      },
    },
  })
  const imageUrls = product?.images.map((image) => image.url) ?? []

  const latest = await db.landingPage.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const version = (latest?.version ?? 0) + 1

  const [, page] = await db.$transaction([
    db.landingPage.updateMany({ where: { projectId }, data: { isCurrent: false } }),
    db.landingPage.create({
      data: {
        projectId,
        version,
        title: result.data.title,
        headline: result.data.headline,
        subheadline: result.data.subheadline,
        isCurrent: true,
        rawData: { synthetic: result.synthetic },
        sections: {
          create: result.data.sections.map((section, index) => ({
            kind: section.kind,
            order: index,
            title: section.title,
            subtitle: section.subtitle,
            body: section.body,
            items: section.items,
            ctaLabel: section.ctaLabel,
            imageUrl: section.imageHint ? (imageUrls[index % Math.max(1, imageUrls.length)] ?? null) : null,
          })),
        },
      },
    }),
  ])

  await advanceStage(projectId, 'LP')
  return { landingPageId: page.id, version, sections: result.data.sections.length, synthetic: result.synthetic }
}

export const lpJobHandlers: Record<string, JobHandler> = {
  'lp.generate': generate,
}
