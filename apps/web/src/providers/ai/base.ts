import type { z } from 'zod'
import { emptyUsage, providerError, type ProviderOutcome, type UsageMetrics } from '../types'
import type { AIProvider, CompleteOptions, CompletionResult } from './types'
import { extractJson } from './json'
import { logger } from '@/lib/logger'

const JSON_INSTRUCTION = `出力は JSON のみとし、前後に説明文・コードフェンス・コメントを付けないこと。`

/**
 * completeJson の共通実装。
 * 1回目のJSONが壊れていた場合のみ、エラー内容を添えて1度だけ再試行する(R7)。
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: string
  /** 実際の推論を行わない疑似Providerかどうか。Mock/Production分離の判定に使う(要件121)。 */
  readonly synthetic: boolean = false

  abstract isConfigured(): boolean
  abstract complete(options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>>

  async completeJson<T>(
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options: CompleteOptions,
  ): Promise<ProviderOutcome<T>> {
    const withInstruction: CompleteOptions = {
      ...options,
      jsonMode: true,
      system: [options.system, JSON_INSTRUCTION].filter(Boolean).join('\n\n'),
    }

    const first = await this.complete(withInstruction)
    if (!first.ok) return first

    const parsed = this.parse(schema, first.data.text)
    if (parsed.success) return { ok: true, data: parsed.value, usage: first.usage }

    logger.warn('ai.json_repair', { provider: this.id, reason: parsed.reason })

    const repair = await this.complete({
      ...withInstruction,
      messages: [
        ...withInstruction.messages,
        { role: 'assistant', content: first.data.text.slice(0, 4000) },
        {
          role: 'user',
          content: `直前の出力は要求スキーマを満たしていません。理由: ${parsed.reason}\nスキーマに完全準拠したJSONだけを再出力してください。`,
        },
      ],
    })
    if (!repair.ok) return repair

    const retried = this.parse(schema, repair.data.text)
    if (retried.success) {
      return { ok: true, data: retried.value, usage: mergeUsage(first.usage, repair.usage) }
    }

    return {
      ok: false,
      error: providerError(this.id, 'INVALID_RESPONSE', `AI応答がスキーマに適合しません: ${retried.reason}`),
      usage: mergeUsage(first.usage, repair.usage),
    }
  }

  private parse<T>(
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    text: string,
  ): { success: true; value: T } | { success: false; reason: string } {
    const json = extractJson(text)
    if (json === undefined) return { success: false, reason: 'JSONを抽出できませんでした' }

    const result = schema.safeParse(json)
    if (result.success) return { success: true, value: result.data }
    return {
      success: false,
      reason: result.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join(' / '),
    }
  }
}

export function mergeUsage(a: UsageMetrics, b: UsageMetrics): UsageMetrics {
  return {
    ...b,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    imageCount: a.imageCount + b.imageCount,
    videoSeconds: a.videoSeconds + b.videoSeconds,
    estimatedCostMicro: a.estimatedCostMicro + b.estimatedCostMicro,
  }
}

export function usageFor(provider: string, model: string): UsageMetrics {
  return emptyUsage(provider, model)
}
