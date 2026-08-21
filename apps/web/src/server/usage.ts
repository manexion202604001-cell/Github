import 'server-only'
import { db } from '@/server/db'
import { logger } from '@/lib/logger'
import type { UsageMetrics } from '@/providers/types'

function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export type UsageInput = {
  organizationId: string
  projectId?: string | null
  jobId?: string | null
  purpose: string
  usage: UsageMetrics
}

/**
 * Provider 呼び出し1回ごとにコストと利用量を記録する(要件116, 117)。
 */
export async function recordUsage(input: UsageInput): Promise<void> {
  const { organizationId, usage } = input
  const period = currentPeriod()

  try {
    await db.$transaction([
      db.aIJob.create({
        data: {
          jobId: input.jobId ?? null,
          organizationId,
          projectId: input.projectId ?? null,
          purpose: input.purpose,
          provider: usage.provider,
          model: usage.model,
          status: usage.failed ? 'FAILED' : 'COMPLETED',
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          imageCount: usage.imageCount,
          videoSeconds: usage.videoSeconds,
          estimatedCostMicro: usage.estimatedCostMicro,
          latencyMs: usage.latencyMs ?? null,
          error: usage.error ?? null,
        },
      }),
      db.usageRecord.upsert({
        where: { organizationId_period: { organizationId, period } },
        create: {
          organizationId,
          period,
          imageGenerationCount: usage.imageCount,
          videoGenerationCount: usage.videoSeconds > 0 ? 1 : 0,
          marketResearchCount: input.purpose.startsWith('market-research') ? 1 : 0,
          llmInputTokens: usage.inputTokens,
          llmOutputTokens: usage.outputTokens,
          estimatedCostMicro: usage.estimatedCostMicro,
        },
        update: {
          imageGenerationCount: { increment: usage.imageCount },
          videoGenerationCount: { increment: usage.videoSeconds > 0 ? 1 : 0 },
          marketResearchCount: { increment: input.purpose.startsWith('market-research') ? 1 : 0 },
          llmInputTokens: { increment: usage.inputTokens },
          llmOutputTokens: { increment: usage.outputTokens },
          estimatedCostMicro: { increment: usage.estimatedCostMicro },
        },
      }),
    ])
  } catch (error) {
    logger.error('usage.write_failed', {
      purpose: input.purpose,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
