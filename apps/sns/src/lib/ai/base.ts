import type { z } from 'zod'
import { emptyUsage, providerError, type AIProvider, type CompleteOptions, type CompletionResult, type ProviderOutcome, type UsageMetrics } from './types'
import { extractJson } from './json'
import { logger } from '@/lib/logger'

const JSON_INSTRUCTION = '出力は JSON のみとし、前後に説明文・コードフェンス・コメントを付けないこと。'

/** スキーマ不適合時の修復試行回数(要件50: 最大2回まで repair)。 */
const MAX_REPAIRS = 2

/**
 * generateStructured の共通実装。
 * AIの生成物は必ず zod で検証し、壊れていれば最大2回まで自己修復を試みる。
 * それでも失敗した場合はエラーを返し、未検証のデータをDBへ渡さない(要件50, 111)。
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: string
  readonly synthetic: boolean = false

  abstract isConfigured(): boolean
  abstract generateText(options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>>

  async generateStructured<T>(
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options: CompleteOptions,
  ): Promise<ProviderOutcome<T>> {
    const base: CompleteOptions = {
      ...options,
      jsonMode: true,
      system: [options.system, JSON_INSTRUCTION].filter(Boolean).join('\n\n'),
    }

    let attempt = await this.generateText(base)
    if (!attempt.ok) return attempt

    let usage = attempt.usage
    let parsed = this.parse(schema, attempt.data.text)

    for (let repair = 0; !parsed.success && repair < MAX_REPAIRS; repair += 1) {
      logger.warn('ai.json_repair', { provider: this.id, attempt: repair + 1, reason: parsed.reason })
      const previousText = attempt.ok ? attempt.data.text : ''
      attempt = await this.generateText({
        ...base,
        messages: [
          ...base.messages,
          { role: 'assistant', content: previousText.slice(0, 4000) },
          {
            role: 'user',
            content: `直前の出力は要求スキーマを満たしていません。理由: ${parsed.reason}\nスキーマに完全準拠したJSONだけを再出力してください。`,
          },
        ],
      })
      if (!attempt.ok) return { ok: false, error: attempt.error, usage: mergeUsage(usage, attempt.usage) }
      usage = mergeUsage(usage, attempt.usage)
      parsed = this.parse(schema, attempt.data.text)
    }

    if (parsed.success) return { ok: true, data: parsed.value, usage }

    return {
      ok: false,
      error: providerError(this.id, 'INVALID_RESPONSE', `生成形式の解析に失敗しました: ${parsed.reason}`),
      usage,
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
    estimatedCostMicro: a.estimatedCostMicro + b.estimatedCostMicro,
  }
}

export function usageFor(provider: string, model: string): UsageMetrics {
  return emptyUsage(provider, model)
}
