export type SearchResult = {
  title: string
  url: string
  domain: string
  snippet: string
  publishedAt: Date | null
}

export type SearchQuery = {
  query: string
  /** 調査対象地域。Providerがサポートする場合のみ利用する。 */
  region?: string
  maxResults?: number
}

export type SearchOutcome =
  | { ok: true; results: SearchResult[] }
  | { ok: false; message: string; retryable: boolean }

/**
 * 検索サービスのAdapter(要件16)。
 * Tavily / Brave / SerpAPI を差し替え可能にするため、
 * 業務ロジックはこのインターフェースだけに依存する。
 */
export interface SearchProvider {
  readonly id: string
  /** 実際の検索を行わない疑似Providerか。 */
  readonly synthetic: boolean
  isConfigured(): boolean
  search(query: SearchQuery): Promise<SearchOutcome>
}
