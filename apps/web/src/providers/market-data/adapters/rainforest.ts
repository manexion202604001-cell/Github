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

const API_URL = 'https://api.rainforestapi.com/request'

/**
 * Rainforest API — Amazon商品データの商用データProvider。
 * Amazon本体への直接スクレイピングは規約・robots.txtで禁止されているため、
 * データ収集を専業ベンダーに委ねるこの方式を採用する(要件22/24の
 * Data Provider Adapter経由での取得に該当)。
 * 検索・商品詳細に加えてレビュー本文も取得できるため、不満クラスタリング(要件26,27)が
 * 実際のAmazonレビューで動作する。
 */

type RainforestPrice = { value?: number; currency?: string }
type RainforestSearchItem = {
  position?: number
  title?: string
  asin?: string
  link?: string
  image?: string
  brand?: string
  rating?: number
  ratings_total?: number
  price?: RainforestPrice
  prices?: RainforestPrice[]
}
type RainforestProduct = {
  title?: string
  asin?: string
  link?: string
  brand?: string
  rating?: number
  ratings_total?: number
  main_image?: { link?: string }
  categories?: { name?: string }[]
  feature_bullets?: string[]
  dimensions?: string
  weight?: string
  buybox_winner?: { price?: RainforestPrice; seller?: { name?: string } }
  bestsellers_rank?: { rank?: number }[]
}
type RainforestReview = {
  title?: string
  body?: string
  rating?: number
  date?: { utc?: string; raw?: string }
  helpful_votes?: number
}

export class RainforestMarketDataProvider implements MarketDataProvider {
  readonly id = 'rainforest'
  readonly synthetic = false
  readonly sourceLabel = 'Amazon(Rainforest API)'

  constructor(
    private readonly apiKey: string,
    private readonly amazonDomain = 'amazon.co.jp',
  ) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  private url(params: Record<string, string>): string {
    const query = new URLSearchParams({
      api_key: this.apiKey,
      amazon_domain: this.amazonDomain,
      ...params,
    })
    return `${API_URL}?${query.toString()}`
  }

  async searchProducts(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    const usage = emptyUsage(this.id, 'search')
    const result = await getJson(
      this.id,
      this.url({ type: 'search', search_term: input.keyword, sort_by: 'featured' }),
      {},
      60_000,
    )
    if (!result.ok) return { ok: false, error: result.error, usage }

    const body = result.body as { search_results?: RainforestSearchItem[] }
    const items = body.search_results ?? []
    if (items.length === 0) {
      return { ok: false, error: providerError(this.id, 'INVALID_RESPONSE', '検索結果が空でした'), usage }
    }

    const products = items
      .filter((item): item is RainforestSearchItem & { asin: string } => typeof item.asin === 'string')
      .slice(0, input.limit ?? 24)
      .map(
        (item, index): MarketProduct => ({
          externalId: item.asin,
          title: item.title ?? item.asin,
          url: item.link,
          imageUrl: item.image,
          brand: item.brand,
          price: priceOf(item.price) ?? priceOf(item.prices?.[0]),
          currency: 'JPY',
          rating: item.rating,
          reviewCount: item.ratings_total,
          rank: item.position ?? index + 1,
          features: [],
          raw: item,
        }),
      )

    return { ok: true, data: products, usage }
  }

  async getCompetitors(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    return this.searchProducts({ ...input, limit: input.limit ?? 24 })
  }

  async getProduct(externalId: string): Promise<ProviderOutcome<MarketProduct>> {
    const usage = emptyUsage(this.id, 'product')
    const result = await getJson(this.id, this.url({ type: 'product', asin: externalId }), {}, 60_000)
    if (!result.ok) return { ok: false, error: result.error, usage }

    const body = result.body as { product?: RainforestProduct }
    const product = body.product
    if (!product) {
      return { ok: false, error: providerError(this.id, 'INVALID_RESPONSE', '商品情報を取得できませんでした'), usage }
    }

    return {
      ok: true,
      data: {
        externalId,
        title: product.title ?? externalId,
        url: product.link,
        imageUrl: product.main_image?.link,
        brand: product.brand,
        price: priceOf(product.buybox_winner?.price),
        currency: 'JPY',
        rating: product.rating,
        reviewCount: product.ratings_total,
        rank: product.bestsellers_rank?.[0]?.rank,
        category: product.categories?.map((category) => category.name).filter(Boolean).join(' > '),
        size: product.dimensions,
        weight: product.weight,
        seller: product.buybox_winner?.seller?.name,
        features: (product.feature_bullets ?? []).slice(0, 10),
        raw: product,
      },
      usage,
    }
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
        marketplace: this.amazonDomain,
        keyword: input.keyword,
        marketSize: averagePrice ? totalReviews * averagePrice : null,
        growthRate: null,
        competitionScore: estimateCompetitionScore(products),
        averagePrice,
        priceRange,
        demandTrend: [],
        notes: [
          `Amazon(${this.amazonDomain})の実データです(Rainforest API経由)。`,
          '市場規模はレビュー総数×平均価格からの推計であり、実売上ではありません。',
        ],
      },
      usage: search.usage,
    }
  }

  async getKeyword(keyword: string): Promise<ProviderOutcome<KeywordInsight>> {
    const usage = emptyUsage(this.id, 'search')
    const search = await this.searchProducts({ keyword, limit: 30 })
    if (!search.ok) return { ok: false, error: search.error, usage }

    const counts = new Map<string, number>()
    for (const product of search.data) {
      for (const token of product.title.split(/[\s、,/()()【】\[\]|・]+/)) {
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

  async getReviews(externalId: string, limit = 40): Promise<ProviderOutcome<MarketReview[]>> {
    const usage = emptyUsage(this.id, 'reviews')
    const result = await getJson(this.id, this.url({ type: 'reviews', asin: externalId }), {}, 60_000)
    if (!result.ok) return { ok: false, error: result.error, usage }

    const body = result.body as { reviews?: RainforestReview[] }
    const reviews = (body.reviews ?? [])
      .filter((review): review is RainforestReview & { body: string } => typeof review.body === 'string' && review.body.length > 3)
      .slice(0, limit)
      .map(
        (review): MarketReview => ({
          productExternalId: externalId,
          rating: review.rating,
          title: review.title,
          body: review.body,
          date: review.date?.utc ?? review.date?.raw,
          helpfulCount: review.helpful_votes,
        }),
      )

    if (reviews.length === 0) {
      return { ok: false, error: providerError(this.id, 'INVALID_RESPONSE', 'レビューを取得できませんでした'), usage }
    }
    return { ok: true, data: reviews, usage }
  }
}

function priceOf(price: RainforestPrice | undefined): number | undefined {
  if (!price || typeof price.value !== 'number') return undefined
  return Math.round(price.value)
}
