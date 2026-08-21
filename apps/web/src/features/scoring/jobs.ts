import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { runAITask } from '@/server/ai-task'
import { productScoreTask } from '@/prompts/product-score'
import { buildProjectContext } from '@/features/assistant/context'
import { advanceStage } from '@/features/projects/service'
import type { JobHandler } from '@/jobs/types'

const payloadSchema = z.object({ projectId: z.string() })

/** STEP 4: 商品を100点で評価し GO / IMPROVE_GO / NO_GO を判定する(要件29〜34)。 */
const evaluate: JobHandler = async (context) => {
  const { projectId } = payloadSchema.parse(context.payload)
  const snapshot = await buildProjectContext(projectId)
  await context.setProgress(30)

  const result = await runAITask(
    productScoreTask,
    { context: snapshot },
    { organizationId: context.organizationId, projectId, jobId: context.jobId },
  )
  const score = result.data

  const total =
    score.marketDemand +
    score.competition +
    score.differentiation +
    score.profitability +
    score.logistics +
    score.advertising +
    score.reviewOpportunity +
    score.expandability +
    score.risk

  // AIの decision と合計点が矛盾する場合は、点数を正とする(判定基準を機械的に適用)。
  const decision = total >= 70 ? 'GO' : total >= 50 ? 'IMPROVE_GO' : 'NO_GO'

  const created = await db.productScore.create({
    data: {
      projectId,
      marketDemand: score.marketDemand,
      competition: score.competition,
      differentiation: score.differentiation,
      profitability: score.profitability,
      logistics: score.logistics,
      advertising: score.advertising,
      reviewOpportunity: score.reviewOpportunity,
      expandability: score.expandability,
      risk: score.risk,
      total,
      decision,
      reason: score.reason,
      strengths: score.strengths,
      weaknesses: score.weaknesses,
      improvements: score.improvements,
      alternativeIdeas: score.alternativeIdeas,
      rawData: { aiDecision: score.decision, synthetic: result.synthetic },
    },
  })

  await advanceStage(projectId, 'EVALUATION')
  await context.setProgress(100)

  return { scoreId: created.id, total, decision, synthetic: result.synthetic }
}

export const scoringJobHandlers: Record<string, JobHandler> = {
  'scoring.evaluate': evaluate,
}
