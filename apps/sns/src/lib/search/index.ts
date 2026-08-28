import 'server-only'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { SearchProvider, SearchQuery, SearchResult } from './types'
import { MockSearchProvider } from './adapters/mock'
import { TavilySearchProvider } from './adapters/tavily'
import { BraveSearchProvider } from './adapters/brave'
import { SerpApiSearchProvider } from './adapters/serpapi'

let cached: SearchProvider[] | null = null

function all(): SearchProvider[] {
  if (!cached) {
    cached = [
      new MockSearchProvider(),
      new TavilySearchProvider(env.search.tavilyKey),
      new BraveSearchProvider(env.search.braveKey),
      new SerpApiSearchProvider(env.search.serpApiKey),
    ]
  }
  return cached
}

/** SEARCH_PROVIDER で切り替え、未設定なら mock へ落とす(要件16, 99)。 */
export function searchProvider(preferredId?: string): SearchProvider {
  const providers = all()
  const requestedId = preferredId ?? env.search.provider
  const requested = providers.find((provider) => provider.id === requestedId)

  if (requested?.isConfigured() && !(env.demoMode && requested.id !== 'mock')) return requested
  if (requested && !requested.isConfigured()) {
    logger.warn('search.provider_not_configured', { requested: requestedId })
  }
  return providers.find((provider) => provider.id === 'mock')!
}

export function searchIsLive(): boolean {
  return !searchProvider().synthetic
}

export type BatchSearchOutcome = {
  results: (SearchResult & { searchQuery: string })[]
  failures: { query: string; message: string }[]
}

/**
 * 複数クエリをまとめて検索し、重複URLを取り除く。
 * 一部のクエリが失敗しても調査全体を止めず、失敗した検索は failures として返す。
 */
export async function searchMany(queries: SearchQuery[], providerId?: string): Promise<BatchSearchOutcome> {
  const provider = searchProvider(providerId)
  const seen = new Set<string>()
  const results: (SearchResult & { searchQuery: string })[] = []
  const failures: { query: string; message: string }[] = []

  const settled = await Promise.all(
    queries.map(async (query) => ({ query, outcome: await provider.search(query) })),
  )

  for (const { query, outcome } of settled) {
    if (!outcome.ok) {
      failures.push({ query: query.query, message: outcome.message })
      continue
    }
    for (const result of outcome.results) {
      const key = result.url.replace(/[#?].*$/, '')
      if (seen.has(key)) continue
      seen.add(key)
      results.push({ ...result, searchQuery: query.query })
    }
  }

  return { results, failures }
}

export type { SearchProvider, SearchQuery, SearchResult } from './types'
