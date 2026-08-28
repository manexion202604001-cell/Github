import type { SearchOutcome, SearchProvider, SearchQuery } from '../types'
import { domainOf } from '../url'
import { searchRequest } from './request'

const API_URL = 'https://api.tavily.com/search'

type TavilyResponse = {
  results?: { title?: string; url?: string; content?: string; published_date?: string }[]
}

/** 既定の検索Provider(要件16)。 */
export class TavilySearchProvider implements SearchProvider {
  readonly id = 'tavily'
  readonly synthetic = false

  constructor(private readonly apiKey: string) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async search(query: SearchQuery): Promise<SearchOutcome> {
    const response = await searchRequest(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        api_key: this.apiKey,
        query: query.query,
        max_results: query.maxResults ?? 5,
        search_depth: 'basic',
        include_answer: false,
      },
    })
    if (!response.ok) return response

    const body = response.body as TavilyResponse
    return {
      ok: true,
      results: (body.results ?? [])
        .filter((item): item is { url: string } & typeof item => typeof item.url === 'string')
        .map((item) => ({
          title: item.title?.trim() || item.url,
          url: item.url,
          domain: domainOf(item.url),
          snippet: (item.content ?? '').slice(0, 600),
          publishedAt: parseDate(item.published_date),
        })),
    }
  }
}

export function parseDate(value: string | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
