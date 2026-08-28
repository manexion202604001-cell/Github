import 'server-only'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { AIProvider } from './types'
import { MockAIProvider } from './adapters/mock'
import { AnthropicProvider } from './adapters/anthropic'
import { OpenAIProvider } from './adapters/openai'

/**
 * AI Provider の解決(要件49)。
 * AI_PROVIDER=anthropic | openai で切り替え、未設定・キー無しなら mock へ落として
 * アプリの全機能が動作し続けるようにする(要件99)。
 */
let cached: AIProvider[] | null = null

function all(): AIProvider[] {
  if (!cached) {
    cached = [
      new MockAIProvider(),
      new AnthropicProvider(env.ai.anthropicKey, env.ai.model),
      new OpenAIProvider(env.ai.openaiKey, env.ai.model),
    ]
  }
  return cached
}

export function aiProvider(preferredId?: string): AIProvider {
  const providers = all()
  const requestedId = preferredId ?? env.ai.provider
  const requested = providers.find((provider) => provider.id === requestedId)

  if (requested?.isConfigured() && !(env.demoMode && requested.id !== 'mock')) return requested
  if (requested && !requested.isConfigured()) {
    logger.warn('ai.provider_not_configured', { requested: requestedId })
  }

  return providers.find((provider) => provider.id === 'mock')!
}

/** 実推論が可能かどうか。Demo Mode バッジの表示判定に使う。 */
export function aiIsLive(preferredId?: string): boolean {
  return !aiProvider(preferredId).synthetic
}

export function availableProviders(): { id: string; configured: boolean }[] {
  return all().map((provider) => ({ id: provider.id, configured: provider.isConfigured() }))
}
