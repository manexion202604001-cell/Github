import 'server-only'
import { env } from '@/lib/env'
import { ProviderRegistry } from '../registry'
import type { BaseAIProvider } from './base'
import { MockAIProvider } from './adapters/mock'
import { AnthropicAIProvider } from './adapters/anthropic'
import { OpenAIAIProvider } from './adapters/openai'
import { GoogleAIProvider } from './adapters/google'

let registry: ProviderRegistry<BaseAIProvider> | null = null

export function aiProviders(): ProviderRegistry<BaseAIProvider> {
  if (!registry) {
    registry = new ProviderRegistry<BaseAIProvider>(
      [
        new MockAIProvider(),
        new AnthropicAIProvider(env.ai.anthropicKey, env.ai.model),
        new OpenAIAIProvider(env.ai.openaiKey, env.ai.model),
        new GoogleAIProvider(env.ai.googleKey, env.ai.model),
      ],
      env.ai.provider,
      'mock',
    )
  }
  return registry
}

export type { AIProvider, CompleteOptions, AIMessageInput } from './types'
