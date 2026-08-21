import 'server-only'
import { env } from '@/lib/env'
import { ProviderRegistry } from '../registry'
import type { ImageProvider } from './types'
import { MockImageProvider } from './adapters/mock'
import { GoogleImageProvider } from './adapters/google'
import { OpenAIImageProvider } from './adapters/openai'

let registry: ProviderRegistry<ImageProvider> | null = null

export function imageProviders(): ProviderRegistry<ImageProvider> {
  if (!registry) {
    registry = new ProviderRegistry<ImageProvider>(
      [
        new MockImageProvider(),
        new GoogleImageProvider(env.ai.googleKey, env.image.model),
        new OpenAIImageProvider(env.ai.openaiKey, env.image.model),
      ],
      env.image.provider,
      'mock',
    )
  }
  return registry
}

export * from './types'
