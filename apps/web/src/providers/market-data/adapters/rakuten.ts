import { emptyUsage, providerError, type ProviderOutcome } from '../../types'
import { getJson } from '../../ai/adapters/http'
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

const SEARCH_URL = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601'

type RakutenItem = {
  itemCode?: string
  itemName?: string
  itemPrice?: number
  itemUrl?: string
  shopName?: string
  reviewCount?: number
  reviewAverage?: number
  genreId?: string
  mediumImageUrls?: { imageUrl?: string }[]
  itemCaption?: string
}

type RakutenResponse = { Items?: { Item?: RakutenItem }[] | RakutenItem[] }

/**
 * 楽天ウェブサービスの公式API。
 * 規約上クリーンに実データを取得できるため、スクレイピングより優先して選択する。
 */
export class RakutenMarketDataProvider implements MarketDataProvider {
  readonly id = 'rakuten'
  readonly synthetic = false
  readonly sourceLabel = '楽天市場(公式API)'

  constructor(private readonly applicationId: string) {}

  isConfigured(): boolean {
    return this.applicationId.length > 0
  }

  async searchProducts(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    const usage = emptyUsage(this.id, 'ichiba-search')
    const params = new URLSearchParams({
      applicationId: this.applicationId,
      keyword: input.keyword,
      hits: String(Math.min(30, input.limit ?? 24)),
      sort: '-reviewCount',
      format: 'json',
    })
    if (input.category) params.set('genreId', input.category)

    const result = await getJson(this.id, `${SEARCH_URL}?${params.toString()}`)
    if (!result.ok) return { ok: false, error: result.error, usage }

    const body = result.body as RakutenResponse
    const items = normalizeItems(body)
    if (items.length === 0) {
      return { ok: false, error: providerError(this.id, 'INVALID_RESPONSE', '検索結果が空でした'), usage }
    }

    const products = items.map((item, index): MarketProduct => ({
      externalId: item.itemCode ?? `rakuten-${index}`,
      title: item.itemName ?? '(no title)',
      url: item.itemUrl,
      imageUrl: item.mediumImageUrls?.[0]?.imageUrl,
      brand: item.shopName,
      price: item.itemPrice,
      currency: 'JPY',
      rating: item.reviewAverage,
      reviewCount: item.reviewCount,
      rank: index + 1,
      category: item.genreId,
      seller: item.shopName,
      features: (item.itemCaption ?? '')
        .split(/[。\n]/)
        .map((line) => line.trim())
        .filter((line) => line.length > 4)
        .slice(0, 6),
      raw: item,
    }))

    return { ok: true, data: products, usage }
  }

  async getCompetitors(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    return this.searchProducts({ ...input, limit: input.limit ?? 24 })
  }

  async getProduct(externalId: string): Promise<ProviderOutcome<MarketProduct>> {
    const usage = emptyUsage(this.id, 'ichiba-search')
    const search = await this.searchProducts({ keyword: externalId, limit: 1 })
    if (!search.ok) return { ok: false, error: search.error, usage }
    const first = search.data[0]
    if (!first) return { ok: false, error: providerError(this.id, 'INVALID_RESPONSE', '商品が見つかりません'), usage }
    return { ok: true, data: first, usage }
  }

  async getMarket(input: SearchInput): Promise<ProviderOutcome<MarketSummary>> {
    const search = await this.searchProducts({ ...input, limit: 30 })
    if (!search.ok) return search

    const products = search.data
    const { averagePrice, priceRange } = summarizePrices(products)
    const totalReviews = products.reduce((sum, product) => sum + (product.reviewCount ?? 0), 0)

    return {
      ok: true,
      data: {
        marketplace: 'rakuten.co.jp',
        keyword: input.keyword,
        marketSize: averagePrice ? totalReviews * averagePrice : null,
        growthRate: null,
        competitionScore: estimateCompetitionScore(products),
        averagePrice,
        priceRange,
        demandTrend: [],
        notes: [
          '楽天市場の公式検索APIによる実データです。',
          '市場規模はレビュー総数×平均価格からの推計であり、実売上ではありません。',
        ],
      },
      usage: search.usage,
    }
  }

  async getKeyword(keyword: string): Promise<ProviderOutcome<KeywordInsight>> {
    const usage = emptyUsage(this.id, 'ichiba-search')
    const search = await this.searchProducts({ keyword, limit: 30 })
    if (!search.ok) return { ok: false, error: search.error, usage }

    const counts = new Map<string, number>()
    for (const product of search.data) {
      for (const token of product.title.split(/[\s、,／/()（）【】\[\]|・]+/)) {
        const clean = token.trim()
        if (clean.length < 2 || clean.length > 12 || clean === keyword) continue
        counts.set(clean, (counts.get(clean) ?? 0) + 1)
      }
    }

    return {
      ok: true,
      data: {
        keyword,
        searchVolume: null,
        competition: null,
        relatedKeywords: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([token]) => token),
      },
      usage,
    }
  }

  async getReviews(): Promise<ProviderOutcome<MarketReview[]>> {
    // 楽天の公開APIは個別レビュー本文を返さない。レビュー解析は別Providerへ委譲する。
    return {
      ok: false,
      error: providerError(this.id, 'UNSUPPORTED', 'このProviderはレビュー本文の取得に対応していません'),
      usage: emptyUsage(this.id, 'ichiba-search'),
    }
  }
}

function normalizeItems(body: RakutenResponse): RakutenItem[] {
  const items = body.Items ?? []
  return items.map((entry) => ('Item' in entry && entry.Item ? entry.Item : (entry as RakutenItem)))
}
