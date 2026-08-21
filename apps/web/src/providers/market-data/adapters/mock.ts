import { emptyUsage, type ProviderOutcome } from '../../types'
import {
  estimateCompetitionScore,
  summarizePrices,
  type KeywordInsight,
  type MarketDataProvider,
  type MarketProduct,
  type MarketReview,
  type MarketSummary,
  type SearchInput,
} from '../types'

/**
 * 市場データProvider未設定時のサンプルデータ。
 * 決定論的(キーワードから同じ結果)なので、開発・デモ・テストで再現性がある。
 * Production Data とは `synthetic: true` で明確に区別される(要件121)。
 */
export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = 'mock'
  readonly synthetic = true
  readonly sourceLabel = 'サンプルデータ'

  isConfigured(): boolean {
    return true
  }

  async searchProducts(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    return { ok: true, data: buildProducts(input), usage: emptyUsage(this.id, 'mock') }
  }

  async getCompetitors(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    return this.searchProducts({ ...input, limit: input.limit ?? 24 })
  }

  async getProduct(externalId: string): Promise<ProviderOutcome<MarketProduct>> {
    const [product] = buildProducts({ keyword: externalId, limit: 1 })
    return {
      ok: true,
      data: product ?? {
        externalId,
        title: externalId,
        currency: 'JPY',
        features: [],
      },
      usage: emptyUsage(this.id, 'mock'),
    }
  }

  async getMarket(input: SearchInput): Promise<ProviderOutcome<MarketSummary>> {
    const products = buildProducts({ ...input, limit: 24 })
    const { averagePrice, priceRange } = summarizePrices(products)
    const seed = hash(input.keyword)

    return {
      ok: true,
      data: {
        marketplace: input.marketplace ?? 'amazon.co.jp',
        keyword: input.keyword,
        marketSize: 40_000_000 + (seed % 260_000_000),
        growthRate: Number((((seed % 260) - 60) / 1000).toFixed(3)),
        competitionScore: estimateCompetitionScore(products),
        averagePrice,
        priceRange,
        demandTrend: buildTrend(seed),
        notes: [
          'これはProvider未設定時のサンプルデータです。実データではありません。',
          '実データを利用するには MARKET_DATA_PROVIDER と資格情報を設定してください。',
        ],
      },
      usage: emptyUsage(this.id, 'mock'),
    }
  }

  async getKeyword(keyword: string): Promise<ProviderOutcome<KeywordInsight>> {
    const seed = hash(keyword)
    return {
      ok: true,
      data: {
        keyword,
        searchVolume: 1200 + (seed % 48_000),
        competition: Number(((seed % 90) / 100).toFixed(2)),
        relatedKeywords: ['コンパクト', '軽量', '静音', '大容量', '折りたたみ', 'ギフト'].map(
          (suffix) => `${keyword} ${suffix}`,
        ),
      },
      usage: emptyUsage(this.id, 'mock'),
    }
  }

  async getReviews(externalId: string, limit = 40): Promise<ProviderOutcome<MarketReview[]>> {
    const seed = hash(externalId)
    const templates = [
      { rating: 5, body: 'コンパクトで収納しやすく、旅行にちょうど良いサイズでした。買ってよかったです。' },
      { rating: 4, body: '性能は満足ですが、思ったより動作音が大きいです。夜間の使用は少し気になります。' },
      { rating: 2, body: '手入れがしづらいのが最大の不満。分解して洗えないので衛生面が心配です。' },
      { rating: 3, body: '本体が大きすぎて置き場所に困りました。もう一回り小さければ完璧です。' },
      { rating: 5, body: 'ギフト用に購入。梱包が丁寧で、見た目も高級感がありました。' },
      { rating: 1, body: '2ヶ月で電源が入らなくなりました。耐久性に難ありで返品しました。' },
      { rating: 4, body: 'デザインは good。ただ説明書が分かりにくく、最初の設定に時間がかかりました。' },
    ]

    const reviews: MarketReview[] = []
    for (let index = 0; index < limit; index += 1) {
      const template = templates[(seed + index) % templates.length]
      if (!template) continue
      reviews.push({
        productExternalId: externalId,
        rating: template.rating,
        body: template.body,
        date: new Date(Date.now() - index * 86_400_000).toISOString().slice(0, 10),
      })
    }
    return { ok: true, data: reviews, usage: emptyUsage(this.id, 'mock') }
  }
}

const BRANDS = ['AURELIS', 'NOVENTA', 'KIRAMI', 'STELVA', 'HOMURA', 'PLUVIA', 'CANDEO', 'MIRAIQ']
const SUFFIXES = ['プロ', 'ライト', 'ミニ', 'プレミアム', 'コンパクト', 'デラックス', 'エア', 'ネオ']

function buildProducts(input: SearchInput): MarketProduct[] {
  const limit = input.limit ?? 20
  const seed = hash(input.keyword)
  const products: MarketProduct[] = []

  for (let index = 0; index < limit; index += 1) {
    const local = seed + index * 7919
    const brand = BRANDS[local % BRANDS.length] ?? 'AURELIS'
    const suffix = SUFFIXES[(local >> 3) % SUFFIXES.length] ?? 'プロ'
    const price = 1980 + ((local % 42) * 490)
    products.push({
      externalId: `MOCK${String(local % 100_000_000).padStart(8, '0')}`,
      title: `${brand} ${input.keyword} ${suffix}`,
      brand,
      price,
      currency: 'JPY',
      rating: Math.min(4.9, Number((3.3 + (local % 16) / 10).toFixed(1))),
      reviewCount: 12 + ((local * 13) % 4200),
      rank: index + 1,
      category: input.category ?? '生活家電',
      features: ['軽量設計', '静音モード', '国内メーカー保証'],
    })
  }
  return products
}

function buildTrend(seed: number): { period: string; value: number }[] {
  const now = new Date()
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
    const wave = Math.sin((index + (seed % 12)) / 1.9) * 22
    return {
      period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      value: Math.max(10, Math.round(100 + wave + ((seed >> index) % 18))),
    }
  })
}

function hash(value: string): number {
  let h = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}
