import type { Provider, ProviderOutcome } from '../types'

export type MarketProduct = {
  externalId: string
  title: string
  url?: string
  imageUrl?: string
  brand?: string
  price?: number
  currency: string
  rating?: number
  reviewCount?: number
  rank?: number
  category?: string
  size?: string
  weight?: string
  seller?: string
  features: string[]
  raw?: unknown
}

export type MarketReview = {
  productExternalId: string
  rating?: number
  title?: string
  body: string
  date?: string
  helpfulCount?: number
}

export type MarketSummary = {
  marketplace: string
  keyword: string
  /** 推定市場規模(円/月)。取得できない場合は null。 */
  marketSize: number | null
  growthRate: number | null
  competitionScore: number | null
  averagePrice: number | null
  priceRange: { min: number; max: number } | null
  demandTrend: { period: string; value: number }[]
  notes: string[]
}

export type KeywordInsight = {
  keyword: string
  searchVolume: number | null
  competition: number | null
  relatedKeywords: string[]
}

export type SearchInput = {
  keyword: string
  marketplace?: string
  limit?: number
  category?: string
}

export interface MarketDataProvider extends Provider {
  readonly synthetic: boolean
  /** データ取得元の性質。UI上で「実データ/サンプル」を明示するために使う。 */
  readonly sourceLabel: string
  searchProducts(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>>
  getProduct(externalId: string, marketplace?: string): Promise<ProviderOutcome<MarketProduct>>
  getMarket(input: SearchInput): Promise<ProviderOutcome<MarketSummary>>
  getKeyword(keyword: string): Promise<ProviderOutcome<KeywordInsight>>
  getCompetitors(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>>
  getReviews(externalId: string, limit?: number): Promise<ProviderOutcome<MarketReview[]>>
}

/** 価格配列から市場サマリの数値を導出する共通ロジック。 */
export function summarizePrices(products: MarketProduct[]): {
  averagePrice: number | null
  priceRange: { min: number; max: number } | null
} {
  const prices = products
    .map((product) => product.price)
    .filter((price): price is number => typeof price === 'number' && price > 0)
  if (prices.length === 0) return { averagePrice: null, priceRange: null }
  const sum = prices.reduce((total, price) => total + price, 0)
  return {
    averagePrice: Math.round(sum / prices.length),
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
  }
}

/**
 * 競合の強さを 0..100 で近似する。
 * レビュー数の中央値が大きいほど、また上位ブランドの集中度が高いほど強いとみなす。
 */
export function estimateCompetitionScore(products: MarketProduct[]): number | null {
  if (products.length === 0) return null
  const reviewCounts = products
    .map((product) => product.reviewCount ?? 0)
    .sort((a, b) => a - b)
  const median = reviewCounts[Math.floor(reviewCounts.length / 2)] ?? 0
  const reviewPressure = Math.min(60, Math.log10(median + 1) * 20)

  const brands = new Map<string, number>()
  for (const product of products) {
    const brand = product.brand?.trim()
    if (brand) brands.set(brand, (brands.get(brand) ?? 0) + 1)
  }
  const topShare = brands.size === 0 ? 0 : Math.max(...brands.values()) / products.length
  const concentration = topShare * 40

  return Math.round(Math.min(100, reviewPressure + concentration))
}
