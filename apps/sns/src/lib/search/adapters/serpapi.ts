import type { SearchOutcome, SearchProvider, SearchQuery } from '../types'
import { domainOf } from '../url'
import { searchRequest } from './request'
import { parseDate } from './tavily'

const API_URL = 'https://serpapi.com/search.json'

type SerpApiResponse = {
  organic_results?: { title?: string; link?: string; snippet?: string; date?: string }[]
}

export class SerpApiSearchProvider implements SearchProvider {
  readonly id = 'serpapi'
  readonly synthetic = false

  constructor(private readonly apiKey: string) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async search(query: SearchQuery): Promise<SearchOutcome> {
    const url = new URL(API_URL)
    url.searchParams.set('q', query.query)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('num', String(query.maxResults ?? 5))
    url.searchParams.set('hl', 'ja')
    url.searchParams.set('gl', 'jp')

    const response = await searchRequest(url.toString(), { method: 'GET', headers: { accept: 'application/json' } })
    if (!response.ok) return response

    const body = response.body as SerpApiResponse
    return {
      ok: true,
      results: (body.organic_results ?? [])
        .filter((item): item is { link: string } & typeof item => typeof item.link === 'string')
        .map((item) => ({
          title: item.title?.trim() || item.link,
          url: item.link,
          domain: domainOf(item.link),
          snippet: (item.snippet ?? '').slice(0, 600),
          publishedAt: parseDate(item.date),
        })),
    }
  }
}
