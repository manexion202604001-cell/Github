import type { Provider, ProviderOutcome, UsageMetrics } from './types'
import { logger } from '@/lib/logger'

/**
 * Provider の選択と Fallback を担う(要件114, 115)。
 * Business Logic は具体Adapterを import せず、常にこのRegistry経由で取得する。
 */
export class ProviderRegistry<T extends Provider> {
  private readonly providers: Map<string, T>
  private readonly defaultId: string
  private readonly fallbackId: string

  constructor(providers: T[], defaultId: string, fallbackId: string) {
    this.providers = new Map(providers.map((provider) => [provider.id, provider]))
    this.defaultId = defaultId
    this.fallbackId = fallbackId
  }

  list(): T[] {
    return [...this.providers.values()]
  }

  /** 未設定Providerが指定された場合は fallback(mock)へ落として動作を止めない。 */
  get(id?: string): T {
    const requested = id ? this.providers.get(id) : undefined
    if (requested?.isConfigured()) return requested
    if (requested && !requested.isConfigured()) {
      logger.warn('provider.not_configured', { requested: id, fallback: this.fallbackId })
    }

    const preferred = this.providers.get(this.defaultId)
    if (preferred?.isConfigured()) return preferred

    const fallback = this.providers.get(this.fallbackId)
    if (!fallback) throw new Error(`provider registry misconfigured: ${this.fallbackId} is missing`)
    return fallback
  }

  /** 優先順にProviderを返す。呼び出し側は runWithFallback と組み合わせる。 */
  chain(ids?: string[]): T[] {
    const order = ids?.length ? ids : [this.defaultId, this.fallbackId]
    const chain: T[] = []
    for (const id of order) {
      const provider = this.providers.get(id)
      if (provider && provider.isConfigured() && !chain.includes(provider)) chain.push(provider)
    }
    if (chain.length === 0) {
      const fallback = this.providers.get(this.fallbackId)
      if (fallback) chain.push(fallback)
    }
    return chain
  }
}

const RETRY_DELAYS_MS = [500, 1500, 4000]

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * retryable なエラーは指数バックオフで再試行し、尽きたら次のProviderへ。
 * すべて失敗した場合は最後のエラーをそのまま返す(握り潰さない)。
 */
export async function runWithFallback<T, P extends Provider>(
  providers: P[],
  operation: (provider: P) => Promise<ProviderOutcome<T>>,
  options: { maxAttempts?: number } = {},
): Promise<ProviderOutcome<T>> {
  const maxAttempts = options.maxAttempts ?? RETRY_DELAYS_MS.length
  let last: ProviderOutcome<T> | null = null
  const accumulated: UsageMetrics[] = []

  for (const provider of providers) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const outcome = await operation(provider)
      accumulated.push(outcome.usage)
      if (outcome.ok) return { ...outcome, usage: mergeUsage(accumulated, outcome.usage) }

      last = outcome
      if (!outcome.error.retryable) break

      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 1000
      logger.warn('provider.retry', {
        provider: provider.id,
        attempt: attempt + 1,
        kind: outcome.error.kind,
      })
      await sleep(delay)
    }
    logger.warn('provider.fallback', { failed: provider.id })
  }

  if (last) return { ...last, usage: mergeUsage(accumulated, last.usage) }
  throw new Error('runWithFallback called with an empty provider chain')
}

function mergeUsage(all: UsageMetrics[], latest: UsageMetrics): UsageMetrics {
  return all.reduce<UsageMetrics>(
    (acc, usage) => ({
      ...acc,
      inputTokens: acc.inputTokens + usage.inputTokens,
      outputTokens: acc.outputTokens + usage.outputTokens,
      imageCount: acc.imageCount + usage.imageCount,
      videoSeconds: acc.videoSeconds + usage.videoSeconds,
      estimatedCostMicro: acc.estimatedCostMicro + usage.estimatedCostMicro,
    }),
    { ...latest, inputTokens: 0, outputTokens: 0, imageCount: 0, videoSeconds: 0, estimatedCostMicro: 0 },
  )
}
