import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { runAITask } from '@/server/ai-task'
import { sampleEvaluationTask } from '@/prompts/sample-evaluation'
import { buildProjectContext } from '@/features/assistant/context'
import { advanceStage } from '@/features/projects/service'
import { SAMPLE_CRITERIA } from './service'
import type { JobHandler } from '@/jobs/types'

const payloadSchema = z.object({ projectId: z.string(), sampleId: z.string() })

/** STEP 9: サンプルをAIが100点評価し、量産可否を判定する(要件50)。 */
const evaluate: JobHandler = async (context) => {
  const payload = payloadSchema.parse(context.payload)
  const sample = await db.sampleEvaluation.findUnique({ where: { id: payload.sampleId } })
  if (!sample) throw new Error('サンプル評価が見つかりません')

  const scores = Object.fromEntries(
    SAMPLE_CRITERIA.map((criterion) => [criterion.label, sample[criterion.key] ?? null]),
  ) as Record<string, number | null>

  const snapshot = await buildProjectContext(payload.projectId)
  await context.setProgress(35)

  const result = await runAITask(
    sampleEvaluationTask,
    { context: snapshot, round: sample.round, scores, comment: sample.comment },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )

  await db.sampleEvaluation.update({
    where: { id: payload.sampleId },
    data: {
      total: result.data.total,
      decision: result.data.decision,
      aiSummary: result.data.summary,
      aiFindings: result.data.findings,
    },
  })

  await advanceStage(payload.projectId, 'SAMPLE')
  return { total: result.data.total, decision: result.data.decision, synthetic: result.synthetic }
}

export const sampleJobHandlers: Record<string, JobHandler> = {
  'samples.evaluate': evaluate,
}
