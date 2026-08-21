import 'server-only'
import { env } from '@/lib/env'
import { ProviderRegistry } from '../registry'
import type { VideoProvider } from './types'
import { MockVideoProvider } from './adapters/mock'
import { RestVideoProvider } from './adapters/rest'

let registry: ProviderRegistry<VideoProvider> | null = null

export function videoProviders(): ProviderRegistry<VideoProvider> {
  if (!registry) {
    registry = new ProviderRegistry<VideoProvider>(
      [new MockVideoProvider(), new RestVideoProvider(env.video.baseUrl, env.video.apiKey)],
      env.video.provider,
      'mock',
    )
  }
  return registry
}

export * from './types'
