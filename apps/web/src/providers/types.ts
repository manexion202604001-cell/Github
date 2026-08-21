/**
 * 全Provider共通の型。ここには特定ベンダーの語彙を持ち込まない(要件81〜84)。
 */

export type UsageMetrics = {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  imageCount: number
  videoSeconds: number
  estimatedCostMicro: number
  latencyMs?: number
  failed?: boolean
  error?: string
}

export function emptyUsage(provider: string, model: string): UsageMetrics {
  return {
    provider,
    model,
    inputTokens: 0,
    outputTokens: 0,
    imageCount: 0,
    videoSeconds: 0,
    estimatedCostMicro: 0,
  }
}

export type ProviderErrorKind =
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'UNSUPPORTED'
  | 'NETWORK'
  | 'UNKNOWN'

export type ProviderError = {
  kind: ProviderErrorKind
  provider: string
  message: string
  retryable: boolean
  cause?: unknown
}

export function providerError(
  provider: string,
  kind: ProviderErrorKind,
  message: string,
  cause?: unknown,
): ProviderError {
  const retryable = kind === 'RATE_LIMIT' || kind === 'TIMEOUT' || kind === 'NETWORK'
  return { kind, provider, message, retryable, cause }
}

export type ProviderOutcome<T> =
  | { ok: true; data: T; usage: UsageMetrics }
  | { ok: false; error: ProviderError; usage: UsageMetrics }

export interface Provider {
  readonly id: string
  /** 資格情報が揃っていて実際に呼び出せるか。falseなら registry は選択しない。 */
  isConfigured(): boolean
}
