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
import { CONCEPT_DIRECTIONS, buildConceptPrompt } from '@/prompts/image-prompts'

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

  // 画像用のIntegrationが無い場合は、AIプロバイダに登録済みのGoogle/OpenAIキーを
  // 画像生成にも流用する(Google AI Studio / OpenAIのキーは画像APIと共通のため、
  // キーを1回登録するだけで画像生成が動くようにする)。
  const row =
    rows.find((item) => item.kind === 'IMAGE_PROVIDER') ??
    rows.find((item) => item.kind === 'AI_PROVIDER' && (item.provider === 'google' || item.provider === 'openai'))
  if (!row) return base

  const secret = secretOf(row)
  if (!secret) return base

  // AIプロバイダからの流用時はテキスト用モデル名を引き継がない(画像既定モデルを使う)。
  const model = row.kind === 'IMAGE_PROVIDER' ? modelOf(row.config) : ''
  let override: ImageProvider | null = null
  if (row.provider === 'google') override = new GoogleImageProvider(secret, model)
  else if (row.provider === 'openai') override = new OpenAIImageProvider(secret, model)

  if (!override || !override.isConfigured()) return base
  return [override, ...base.filter((provider) => provider.id !== override.id)]
}

/**
 * 診断用: 登録済み画像Providerを実際に1回呼び、結果(またはエラー詳細)を返す。
 * /api/debug/health?image=1 からのみ使用する。キー本体は返さない。
 */
export async function debugTestImageProvider(): Promise<Record<string, unknown>> {
  const imageRow =
    (await db.integration.findFirst({ where: { enabled: true, kind: 'IMAGE_PROVIDER' } })) ??
    (await db.integration.findFirst({
      where: { enabled: true, kind: 'AI_PROVIDER', provider: { in: ['google', 'openai'] } },
    }))
  if (!imageRow) return { configured: false }

  const secret = imageRow.encryptedSecret ? decryptSecret(imageRow.encryptedSecret) : null
  if (!secret) return { configured: true, provider: imageRow.provider, decryptOk: false }

  const model =
    imageRow.kind === 'IMAGE_PROVIDER' &&
    imageRow.config &&
    typeof imageRow.config === 'object' &&
    typeof (imageRow.config as Record<string, unknown>).model === 'string'
      ? ((imageRow.config as Record<string, unknown>).model as string)
      : ''
  const provider =
    imageRow.provider === 'google'
      ? new GoogleImageProvider(secret, model)
      : imageRow.provider === 'openai'
        ? new OpenAIImageProvider(secret, model)
        : null
  if (!provider) return { provider: imageRow.provider, supported: false }

  const outcome = await provider.generate({
    prompt: 'A plain matte gray cube on a seamless white studio background, product photography.',
    count: 1,
    aspectRatio: '1:1',
  })
  return outcome.ok
    ? {
        ok: true,
        provider: imageRow.provider,
        kindUsed: imageRow.kind,
        model: outcome.usage.model || model || '(default)',
        imageBytes: outcome.data[0]?.base64.length ?? 0,
      }
    : {
        ok: false,
        provider: imageRow.provider,
        kindUsed: imageRow.kind,
        errorKind: outcome.error.kind,
        message: outcome.error.message.slice(0, 500),
      }
}

/**
 * 市場データは複数ソース併用(要件22: Amazon中心+その他EC)。
 * 有効なIntegrationをすべてチェーンに載せる。並び順はAmazon(rainforest)優先。
 */
export async function marketDataChainFor(organizationId: string): Promise<MarketDataProvider[]> {
  const base = marketDataProviders().chain()
  const rows = await enabledIntegrations(organizationId)

  const overrides: MarketDataProvider[] = []
  for (const row of rows.filter((item) => item.kind === 'MARKET_DATA')) {
    const secret = secretOf(row)
    if (!secret) continue
    const config = row.config && typeof row.config === 'object' ? (row.config as Record<string, unknown>) : {}
    let override: MarketDataProvider | null = null
    if (row.provider === 'rakuten') {
      // 新Rakuten Developers: Application ID(UUID・config) + Access Key(pk_...・暗号化secret)
      const applicationId = typeof config.applicationId === 'string' ? config.applicationId : ''
      override = new RakutenMarketDataProvider(applicationId, secret)
    } else if (row.provider === 'rainforest') {
      override = new RainforestMarketDataProvider(secret)
    }
    if (override?.isConfigured()) overrides.push(override)
  }

  overrides.sort((a, b) => (a.id === 'rainforest' ? -1 : b.id === 'rainforest' ? 1 : 0))
  const overrideIds = new Set(overrides.map((provider) => provider.id))
  return [...overrides, ...base.filter((provider) => !overrideIds.has(provider.id))]
}

/**
 * 診断用: 登録済みの市場データProvider(楽天/Rainforest)を実際に1回ずつ呼び、
 * キーの有効性と生のエラー内容を確認する。/api/debug/health?market=1 からのみ使用する。
 */
export async function debugTestMarketProviders(): Promise<Record<string, unknown>> {
  const row = await db.integration.findFirst({ where: { enabled: true, kind: 'MARKET_DATA' } })
  const organizationId = row?.organizationId ?? (await db.organization.findFirst({ select: { id: true } }))?.id
  if (!organizationId) return { configured: false, note: '組織がありません' }

  // 保存キーの形状だけを返す(全文は返さない)。「何が保存されているか」の切り分け用
  const rows = await db.integration.findMany({ where: { enabled: true, kind: 'MARKET_DATA', organizationId } })
  const keyShapes = rows.map((item) => {
    const secret = item.encryptedSecret ? decryptSecret(item.encryptedSecret) : null
    const config = item.config && typeof item.config === 'object' ? (item.config as Record<string, unknown>) : {}
    const applicationId = typeof config.applicationId === 'string' ? config.applicationId : null
    if (!secret) return { provider: item.provider, hasSecret: false }
    return {
      provider: item.provider,
      hasSecret: true,
      length: secret.length,
      digitsOnly: /^\d+$/.test(secret),
      hint: `${secret.slice(0, 2)}…${secret.slice(-2)}`,
      applicationId: applicationId ? `${applicationId.slice(0, 8)}…` : null,
      updatedAt: item.updatedAt,
    }
  })

  const chain = (await marketDataChainFor(organizationId)).filter((provider) => !provider.synthetic)
  if (chain.length === 0) return { configured: false, note: '実データProviderが未設定です', keyShapes }

  const results: Record<string, unknown>[] = []
  for (const provider of chain) {
    const started = Date.now()
    const outcome = await provider.searchProducts({ keyword: '衣類スチーマー', limit: 3 })
    results.push(
      outcome.ok
        ? { provider: provider.id, ok: true, ms: Date.now() - started, items: outcome.data.length, sample: outcome.data[0]?.title?.slice(0, 60) }
        : { provider: provider.id, ok: false, ms: Date.now() - started, errorKind: outcome.error.kind, message: outcome.error.message.slice(0, 300) },
    )
  }
  return { configured: true, keyShapes, results }
}

/**
 * 診断用: 本番のコンセプト生成プロンプトで実際に1枚生成し、画像を返す。
 * /api/debug/health?image=concept&variant=A からのみ使用する(画質確認用)。
 */
export async function debugGenerateConceptImage(variant: 'A' | 'B' | 'C'): Promise<Record<string, unknown>> {
  const imageRow =
    (await db.integration.findFirst({ where: { enabled: true, kind: 'IMAGE_PROVIDER' } })) ??
    (await db.integration.findFirst({
      where: { enabled: true, kind: 'AI_PROVIDER', provider: { in: ['google', 'openai'] } },
    }))
  if (!imageRow) return { configured: false }

  const secret = imageRow.encryptedSecret ? decryptSecret(imageRow.encryptedSecret) : null
  if (!secret) return { configured: true, provider: imageRow.provider, decryptOk: false }

  const model =
    imageRow.kind === 'IMAGE_PROVIDER' &&
    imageRow.config &&
    typeof imageRow.config === 'object' &&
    typeof (imageRow.config as Record<string, unknown>).model === 'string'
      ? ((imageRow.config as Record<string, unknown>).model as string)
      : ''
  const provider =
    imageRow.provider === 'google'
      ? new GoogleImageProvider(secret, model)
      : imageRow.provider === 'openai'
        ? new OpenAIImageProvider(secret, model)
        : null
  if (!provider) return { provider: imageRow.provider, supported: false }

  const direction = CONCEPT_DIRECTIONS.find((item) => item.variant === variant) ?? CONCEPT_DIRECTIONS[0]
  if (!direction) return { ok: false, message: 'コンセプト方向が定義されていません' }

  const prompt = buildConceptPrompt(
    {
      name: 'ラベンダーカラーの美容液ボトル',
      category: 'スキンケア(美容液)',
      description: '30代女性向け、ギフトにも選ばれる高級感のあるエアレスポンプ美容液',
      material: 'マット塗装の樹脂+メタルアクセント',
      color: 'ラベンダー / シルバー',
      size: 'W45 × D30 × H120 mm',
      features: ['エアレスポンプ', '片手で使える形状', '詰め替え対応'],
    },
    direction,
  )

  const outcome = await provider.generate({ prompt, count: 1, aspectRatio: '1:1' })
  return outcome.ok
    ? {
        ok: true,
        variant,
        model: outcome.usage.model || model || '(default)',
        mimeType: outcome.data[0]?.mimeType ?? 'image/png',
        base64: outcome.data[0]?.base64 ?? '',
      }
    : { ok: false, variant, errorKind: outcome.error.kind, message: outcome.error.message.slice(0, 500) }
}
