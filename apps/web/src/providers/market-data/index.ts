import 'server-only'
import { env } from '@/lib/env'
import { ProviderRegistry } from '../registry'
import type { MarketDataProvider } from './types'
import { MockMarketDataProvider } from './adapters/mock'
import { RakutenMarketDataProvider } from './adapters/rakuten'
import { RainforestMarketDataProvider } from './adapters/rainforest'
import { ScraperMarketDataProvider } from './adapters/scraper'

let registry: ProviderRegistry<MarketDataProvider> | null = null

export function marketDataProviders(): ProviderRegistry<MarketDataProvider> {
  if (!registry) {
    registry = new ProviderRegistry<MarketDataProvider>(
      [
        new MockMarketDataProvider(),
        new RakutenMarketDataProvider(env.marketData.rakutenApplicationId),
        new RainforestMarketDataProvider(env.marketData.rainforestApiKey, env.marketData.amazonDomain),
        new ScraperMarketDataProvider({
          baseUrl: env.marketData.scraperBaseUrl,
          userAgent: env.marketData.scraperUserAgent,
          minIntervalMs: env.marketData.scraperMinIntervalMs,
          respectRobots: env.marketData.scraperRespectRobots,
        }),
      ],
      env.marketData.provider,
      'mock',
    )
  }
  return registry
}

export * from './types'
