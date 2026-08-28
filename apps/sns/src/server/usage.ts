import 'server-only'
import { db } from '@/server/db'
import { logger } from '@/lib/logger'
import type { UsageMetrics } from '@/lib/ai/types'

export type UsageInput = {
  organizationId: string
  userId?: string | null
  feature: string
  usage: UsageMetrics
}

/**
 * AI呼び出し1回ごとの利用量を記録する(要件68)。
 * 将来の料金プラン算定に使うため、失敗した呼び出しも failed フラグ付きで残す。
 */
export async function recordUsage(input: UsageInput): Promise<void> {
  try {
    await db.aiUsageLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        feature: input.feature,
        provider: input.usage.provider,
        model: input.usage.model,
        inputTokens: input.usage.inputTokens,
        outputTokens: input.usage.outputTokens,
        estimatedCostMicro: input.usage.estimatedCostMicro,
        latencyMs: input.usage.latencyMs ?? null,
        failed: input.usage.failed ?? false,
        error: input.usage.error ?? null,
      },
    })
  } catch (error) {
    logger.error('usage.write_failed', {
      feature: input.feature,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
