import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { runAITask } from '@/server/ai-task'
import { productImprovementTask } from '@/prompts/product-improvement'
import { salesAnalysisTask } from '@/prompts/sales-analysis'
import { launchChecklistTask } from '@/prompts/launch-checklist'
import { buildProjectContext } from '@/features/assistant/context'
import { advanceStage, replaceTasks } from '@/features/projects/service'
import { createProductVersion } from '@/features/products/service'
import type { JobHandler } from '@/jobs/types'

const improvementPayload = z.object({
  projectId: z.string(),
  phase: z.enum(['DESIGN', 'POST_SALE']).default('DESIGN'),
})

/** STEP 5 / 13: 改善提案を生成し、次回ロットの内容をVersionとして残す(要件35, 72〜76)。 */
const generateImprovements: JobHandler = async (context) => {
  const payload = improvementPayload.parse(context.payload)
  const snapshot = await buildProjectContext(payload.projectId)
  await context.setProgress(25)

  const result = await runAITask(
    productImprovementTask,
    { context: snapshot, phase: payload.phase },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )
  await context.setProgress(70)

  await db.$transaction([
    db.improvement.deleteMany({ where: { projectId: payload.projectId, status: 'PROPOSED' } }),
    db.improvement.createMany({
      data: result.data.improvements.map((improvement) => ({
        projectId: payload.projectId,
        target: improvement.target,
        title: improvement.title,
        currentState: improvement.currentState,
        proposal: improvement.proposal,
        reason: improvement.reason,
        expectedEffect: improvement.expectedEffect,
        priority: improvement.priority,
        evidence: improvement.evidence,
      })),
    }),
  ])

  if (payload.phase === 'POST_SALE' && result.data.nextLotSummary) {
    const product = await db.product.findUnique({ where: { projectId: payload.projectId }, select: { id: true } })
    if (product) {
      await createProductVersion({
        productId: product.id,
        specification: { improvements: result.data.improvements },
        changeReason: result.data.nextLotSummary,
        changedFields: result.data.improvements.map((improvement) => improvement.target),
        expectedEffect: result.data.improvements.map((improvement) => improvement.expectedEffect).join(' / '),
      })
    }
  }

  await advanceStage(payload.projectId, 'IMPROVEMENT')
  return {
    count: result.data.improvements.length,
    nextLotSummary: result.data.nextLotSummary,
    relatedProductIdeas: result.data.relatedProductIdeas,
    synthetic: result.synthetic,
  }
}

const projectPayload = z.object({ projectId: z.string() })

/** STEP 13: 販売実績を分析する(要件70〜72)。 */
const analyzeSales: JobHandler = async (context) => {
  const { projectId } = projectPayload.parse(context.payload)
  const snapshot = await buildProjectContext(projectId)
  if (!snapshot.sales) throw new Error('販売データが登録されていません')

  await context.setProgress(30)
  const result = await runAITask(
    salesAnalysisTask,
    { context: snapshot },
    { organizationId: context.organizationId, projectId, jobId: context.jobId },
  )

  return { ...result.data, synthetic: result.synthetic }
}

/** STEP 12: 販売前チェックリストを生成し、タスクとして保存する(要件69)。 */
const generateLaunchChecklist: JobHandler = async (context) => {
  const { projectId } = projectPayload.parse(context.payload)
  const snapshot = await buildProjectContext(projectId)
  await context.setProgress(30)

  const result = await runAITask(
    launchChecklistTask,
    { context: snapshot },
    { organizationId: context.organizationId, projectId, jobId: context.jobId },
  )

  await replaceTasks(
    projectId,
    'LAUNCH',
    result.data.items.map((item) => ({
      title: `[${item.area}] ${item.title}`,
      detail: item.blocking ? `${item.detail}(販売開始の必須項目)` : item.detail,
    })),
  )

  await advanceStage(projectId, 'LAUNCH')
  return { items: result.data.items.length, readiness: result.data.readiness, synthetic: result.synthetic }
}

export const improvementJobHandlers: Record<string, JobHandler> = {
  'improvements.generate': generateImprovements,
  'improvements.salesAnalysis': analyzeSales,
  'improvements.launchChecklist': generateLaunchChecklist,
}
