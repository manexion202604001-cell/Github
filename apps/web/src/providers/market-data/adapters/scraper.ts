import { emptyUsage, providerError, type ProviderOutcome } from '../../types'
import { PoliteFetcher } from '../fetcher'
import { allMatches, firstMatch, parseNumber, parsePrice, stripTags } from '../html'
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

export type ScraperConfig = {
  /** 既定の対象マーケットプレイスのオリジン。例 https://www.amazon.co.jp */
  baseUrl: string
  userAgent: string
  minIntervalMs: number
  respectRobots: boolean
}

/**
 * ECサイトのHTMLから商品情報を抽出するProvider。
 *
 * 運用上の前提(このAdapter内で完結させている):
 *  - robots.txt を尊重し、Disallow のパスは取得しない
 *  - ホストごとに直列 + 最小間隔でアクセスする
 *  - 取得済みページは24時間キャッシュし、同じページを繰り返し叩かない
 *  - User-Agent に連絡可能な識別子を入れる
 *
 * 対象サイトの利用規約によってはHTML取得が禁止されている場合があります。
 * その場合は MARKET_DATA_PROVIDER を公式API系Providerへ切り替えてください。
 * Business Logic 側は Provider の差し替えのみで動作します。
 */
export class ScraperMarketDataProvider implements MarketDataProvider {
  readonly id = 'scraper'
  readonly synthetic = false
  readonly sourceLabel = 'Webデータ取得'

  private readonly fetcher: PoliteFetcher

  constructor(private readonly config: ScraperConfig) {
    this.fetcher = new PoliteFetcher({
      userAgent: config.userAgent,
      minIntervalMs: config.minIntervalMs,
      respectRobots: config.respectRobots,
    })
  }

  isConfigured(): boolean {
    return this.config.baseUrl.length > 0
  }

  private origin(marketplace?: string): string {
    if (!marketplace) return this.config.baseUrl.replace(/\/$/, '')
    if (marketplace.startsWith('http')) return marketplace.replace(/\/$/, '')
    return `https://${marketplace.replace(/\/$/, '')}`
  }

  async searchProducts(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    const usage = emptyUsage(this.id, 'html')
    const origin = this.origin(input.marketplace)
    const url = `${origin}/s?k=${encodeURIComponent(input.keyword)}`

    const outcome = await this.fetcher.get(url)
    if (!outcome.ok) {
      return {
        ok: false,
        error: providerError(
          this.id,
          outcome.reason === 'ROBOTS_DISALLOWED' ? 'UNSUPPORTED' : 'NETWORK',
          outcome.message,
        ),
        usage,
      }
    }

    const products = parseSearchResults(outcome.html, origin, input.limit ?? 24)
    if (products.length === 0) {
      return {
        ok: false,
        error: providerError(this.id, 'INVALID_RESPONSE', '検索結果から商品を抽出できませんでした'),
        usage,
      }
    }
    return { ok: true, data: products, usage }
  }

  async getCompetitors(input: SearchInput): Promise<ProviderOutcome<MarketProduct[]>> {
    return this.searchProducts({ ...input, limit: input.limit ?? 24 })
  }

  async getProduct(externalId: string, marketplace?: string): Promise<ProviderOutcome<MarketProduct>> {
    const usage = emptyUsage(this.id, 'html')
    const origin = this.origin(marketplace)
    const outcome = await this.fetcher.get(`${origin}/dp/${encodeURIComponent(externalId)}`)
    if (!outcome.ok) {
      return {
        ok: false,
        error: providerError(
          this.id,
          outcome.reason === 'ROBOTS_DISALLOWED' ? 'UNSUPPORTED' : 'NETWORK',
          outcome.message,
        ),
        usage,
      }
    }
    return { ok: true, data: parseDetailPage(outcome.html, externalId, origin), usage }
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
        marketplace: input.marketplace ?? this.config.baseUrl,
        keyword: input.keyword,
        // レビュー総数×平均価格から流通規模を粗く近似する。厳密な市場規模ではない。
        marketSize: averagePrice ? totalReviews * averagePrice : null,
        growthRate: null,
        competitionScore: estimateCompetitionScore(products),
        averagePrice,
        priceRange,
        demandTrend: [],
        notes: [
          '市場規模はレビュー総数と平均価格からの推計値です(実売データではありません)。',
          `取得件数: ${products.length}件`,
        ],
      },
      usage: search.usage,
    }
  }

  async getKeyword(keyword: string): Promise<ProviderOutcome<KeywordInsight>> {
    const usage = emptyUsage(this.id, 'html')
    const search = await this.searchProducts({ keyword, limit: 30 })
    if (!search.ok) return { ok: false, error: search.error, usage }

    // 商品タイトルの共起語から関連キーワードを抽出する。
    const counts = new Map<string, number>()
    for (const product of search.data) {
      for (const token of tokenize(product.title)) {
        if (token === keyword) continue
        counts.set(token, (counts.get(token) ?? 0) + 1)
      }
    }
    const related = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([token]) => token)

    return {
      ok: true,
      data: { keyword, searchVolume: null, competition: null, relatedKeywords: related },
      usage,
    }
  }

  async getReviews(externalId: string, limit = 40): Promise<ProviderOutcome<MarketReview[]>> {
    const usage = emptyUsage(this.id, 'html')
    const origin = this.origin()
    const outcome = await this.fetcher.get(`${origin}/product-reviews/${encodeURIComponent(externalId)}`)
    if (!outcome.ok) {
      return {
        ok: false,
        error: providerError(
          this.id,
          outcome.reason === 'ROBOTS_DISALLOWED' ? 'UNSUPPORTED' : 'NETWORK',
          outcome.message,
        ),
        usage,
      }
    }
    return { ok: true, data: parseReviews(outcome.html, externalId).slice(0, limit), usage }
  }
}

// ── HTML抽出 ─────────────────────────────────────────────────────────────
// サイト構造の変化に強くするため、複数の候補パターンを順に試す。

export function parseSearchResults(html: string, origin: string, limit: number): MarketProduct[] {
  const blocks = html.split(/data-asin="/).slice(1)
  const products: MarketProduct[] = []
  const seen = new Set<string>()

  for (const block of blocks) {
    if (products.length >= limit) break
    const externalId = firstMatch(block, /^([A-Z0-9]{10})"/)
    if (!externalId || seen.has(externalId)) continue

    const title =
      firstMatch(block, /<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i) ??
      firstMatch(block, /<h2[^>]*aria-label="([^"]+)"/i)
    if (!title) continue

    seen.add(externalId)
    const priceText =
      firstMatch(block, /<span class="a-offscreen">([^<]+)<\/span>/i) ??
      firstMatch(block, /"price"\s*:\s*"([^"]+)"/i)

    products.push({
      externalId,
      title: stripTags(title),
      url: `${origin}/dp/${externalId}`,
      imageUrl: firstMatch(block, /<img[^>]+src="(https:\/\/[^"]+)"/i) ?? undefined,
      price: parsePrice(priceText),
      currency: 'JPY',
      rating: parseNumber(firstMatch(block, /([\d.]+)\s*(?:つ星のうち|out of 5)/i)),
      reviewCount: parseNumber(firstMatch(block, /aria-label="([\d,]+)件の評価"/i)),
      rank: products.length + 1,
      features: [],
    })
  }

  return products
}

export function parseDetailPage(html: string, externalId: string, origin: string): MarketProduct {
  const title =
    firstMatch(html, /<span[^>]*id="productTitle"[^>]*>([\s\S]*?)<\/span>/i) ??
    firstMatch(html, /<title>([\s\S]*?)<\/title>/i) ??
    externalId

  const features = allMatches(html, /<span class="a-list-item">([\s\S]*?)<\/span>/i)
    .map((item) => stripTags(item))
    .filter((item) => item.length > 6 && item.length < 200)
    .slice(0, 10)

  return {
    externalId,
    title: stripTags(title),
    url: `${origin}/dp/${externalId}`,
    imageUrl: firstMatch(html, /"hiRes"\s*:\s*"([^"]+)"/i) ?? undefined,
    brand: firstMatch(html, /id="bylineInfo"[^>]*>([\s\S]*?)<\/a>/i)?.replace(/ブランド:\s*/, '').trim(),
    price: parsePrice(firstMatch(html, /<span class="a-offscreen">([^<]+)<\/span>/i)),
    currency: 'JPY',
    rating: parseNumber(firstMatch(html, /([\d.]+)\s*(?:つ星のうち|out of 5)/i)),
    reviewCount: parseNumber(firstMatch(html, /([\d,]+)\s*件の(?:評価|グローバル評価)/i)),
    rank: parseNumber(firstMatch(html, /-\s*([\d,]+)位/i)),
    weight: firstMatch(html, /(?:商品の重量|梱包サイズ)[\s\S]{0,80}?([\d.]+\s*(?:g|kg|グラム|キログラム))/i) ?? undefined,
    size: firstMatch(html, /([\d.]+\s*x\s*[\d.]+\s*x\s*[\d.]+\s*cm)/i) ?? undefined,
    seller: firstMatch(html, /id="sellerProfileTriggerId"[^>]*>([\s\S]*?)<\/a>/i)?.trim(),
    features,
  }
}

export function parseReviews(html: string, externalId: string): MarketReview[] {
  const blocks = html.split(/data-hook="review"/).slice(1)
  const reviews: MarketReview[] = []

  for (const block of blocks) {
    const body = firstMatch(block, /data-hook="review-body"[^>]*>([\s\S]*?)<\/span>/i)
    if (!body) continue
    const text = stripTags(body)
    if (text.length < 4) continue

    reviews.push({
      productExternalId: externalId,
      rating: parseNumber(firstMatch(block, /([\d.]+)\s*(?:つ星のうち|out of 5)/i)),
      title: firstMatch(block, /data-hook="review-title"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.trim(),
      body: text,
      date: firstMatch(block, /data-hook="review-date"[^>]*>([\s\S]*?)<\/span>/i)?.trim(),
    })
  }

  return reviews
}

function tokenize(title: string): string[] {
  return title
    .split(/[\s、,／/()（）【】\[\]|・]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && token.length <= 12)
}
