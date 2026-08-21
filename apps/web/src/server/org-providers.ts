import 'server-only'
import { db } from '@/server/db'
import { decryptSecret } from '@/server/crypto'
import { logger } from '@/lib/logger'
import { aiProviders } from '@/providers/ai'
import type { BaseAIProvider } from '@/providers/ai/base'
import { AnthropicAIProvider } from '@/providers/ai/adapters/anthropic'
import { OpenAIAIProvider } from '@/providers/ai/adapters/openai'
import { GoogleAIProvider } from '@/providers/ai/adapters/google'
import { imageProviders, type ImageProvider } from '@/providers/image'
import { GoogleImageProvider } from '@/providers/image/adapters/google'
import { OpenAIImageProvider } from '@/providers/image/adapters/openai'
import { marketDataProviders, type MarketDataProvider } from '@/providers/market-data'
import { RakutenMarketDataProvider } from '@/providers/market-data/adapters/rakuten'
import { RainforestMarketDataProvider } from '@/providers/market-data/adapters/rainforest'

/**
 * Organization単位のBYOK(Bring Your Own Key)解決。
 *
 * 設定画面で登録された Integration(暗号化済みAPIキー)から具体Adapterを組み立て、
 * 環境変数ベースの既定チェーンの先頭に挿入する。
 * 組織のキーが無ければ従来どおり環境変数(なければmock)で動く。
 */

type IntegrationRow = {
  kind: string
  provider: string
  encryptedSecret: string | null
  config: unknown
}

function modelOf(config: unknown): string {
  if (config && typeof config === 'object') {
    const model = (config as Record<string, unknown>).model
    if (typeof model === 'string') return model
  }
  return ''
}

async function enabledIntegrations(organizationId: string): Promise<IntegrationRow[]> {
  return db.integration.findMany({
    where: { organizationId, enabled: true },
    select: { kind: true, provider: true, encryptedSecret: true, config: true },
  })
}

function secretOf(row: IntegrationRow): string | null {
  if (!row.encryptedSecret) return null
  const secret = decryptSecret(row.encryptedSecret)
  if (!secret) {
    logger.warn('org_providers.decrypt_failed', { kind: row.kind, provider: row.provider })
  }
  return secret
}

export async function aiChainFor(organizationId: string): Promise<BaseAIProvider[]> {
  const base = aiProviders().chain()
  const rows = await enabledIntegrations(organizationId)
  const row = rows.find((item) => item.kind === 'AI_PROVIDER')
  if (!row) return base

  const secret = secretOf(row)
  if (!secret) return base

  const model = modelOf(row.config)
  let override: BaseAIProvider | null = null
  if (row.provider === 'anthropic') override = new AnthropicAIProvider(secret, model)
  else if (row.provider === 'openai') override = new OpenAIAIProvider(secret, model)
  else if (row.provider === 'google') override = new GoogleAIProvider(secret, model)

  if (!override || !override.isConfigured()) return base
  return [override, ...base.filter((provider) => provider.id !== override.id)]
}

export async function imageChainFor(organizationId: string): Promise<ImageProvider[]> {
  const base = imageProviders().chain()
  const rows = await enabledIntegrations(organizationId)
  const row = rows.find((item) => item.kind === 'IMAGE_PROVIDER')
  if (!row) return base

  const secret = secretOf(row)
  if (!secret) return base

  const model = modelOf(row.config)
  let override: ImageProvider | null = null
  if (row.provider === 'google') override = new GoogleImageProvider(secret, model)
  else if (row.provider === 'openai') override = new OpenAIImageProvider(secret, model)

  if (!override || !override.isConfigured()) return base
  return [override, ...base.filter((provider) => provider.id !== override.id)]
}

export async function marketDataChainFor(organizationId: string): Promise<MarketDataProvider[]> {
  const base = marketDataProviders().chain()
  const rows = await enabledIntegrations(organizationId)
  const row = rows.find((item) => item.kind === 'MARKET_DATA')
  if (!row) return base

  const secret = secretOf(row)
  if (!secret) return base

  let override: MarketDataProvider | null = null
  if (row.provider === 'rakuten') override = new RakutenMarketDataProvider(secret)
  else if (row.provider === 'rainforest') override = new RainforestMarketDataProvider(secret)

  if (override?.isConfigured()) {
    const id = override.id
    return [override, ...base.filter((provider) => provider.id !== id)]
  }
  return base
}
