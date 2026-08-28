import type { z } from 'zod'

export type UsageMetrics = {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCostMicro: number
  latencyMs?: number
  failed?: boolean
  error?: string
}

export function emptyUsage(provider: string, model: string): UsageMetrics {
  return { provider, model, inputTokens: 0, outputTokens: 0, estimatedCostMicro: 0 }
}

export type ProviderErrorKind = 'AUTH' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'NETWORK' | 'UNKNOWN'

export type ProviderError = {
  kind: ProviderErrorKind
  provider: string
  message: string
  retryable: boolean
}

export function providerError(provider: string, kind: ProviderErrorKind, message: string): ProviderError {
  return { kind, provider, message, retryable: kind === 'RATE_LIMIT' || kind === 'TIMEOUT' || kind === 'NETWORK' }
}

export type ProviderOutcome<T> =
  | { ok: true; data: T; usage: UsageMetrics }
  | { ok: false; error: ProviderError; usage: UsageMetrics }

export type AIMessage = { role: 'user' | 'assistant'; content: string }

export type CompleteOptions = {
  system?: string
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
  /**
   * 外部由来(検索結果・レビュー本文など)のテキスト。
   * Adapter が <untrusted_data> で隔離する(要件67, Prompt Injection対策)。
   */
  untrusted?: { label: string; content: string }[]
}

export type CompletionResult = { text: string; model: string }

/** 要件49: generateText / generateStructured を持つ AIProvider インターフェース。 */
export interface AIProvider {
  readonly id: string
  /** 実推論を行わない疑似Providerか。Demo Modeの判定に使う。 */
  readonly synthetic: boolean
  isConfigured(): boolean
  generateText(options: CompleteOptions): Promise<ProviderOutcome<CompletionResult>>
  generateStructured<T>(
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options: CompleteOptions,
  ): Promise<ProviderOutcome<T>>
}
