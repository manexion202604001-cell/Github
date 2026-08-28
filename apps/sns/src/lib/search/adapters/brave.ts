import type { SearchOutcome, SearchProvider, SearchQuery } from '../types'
import { domainOf } from '../url'
import { searchRequest } from './request'
import { parseDate } from './tavily'

const API_URL = 'https://api.search.brave.com/res/v1/web/search'

type BraveResponse = {
  web?: { results?: { title?: string; url?: string; description?: string; age?: string }[] }
}

export class BraveSearchProvider implements SearchProvider {
  readonly id = 'brave'
  readonly synthetic = false

  constructor(private readonly apiKey: string) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async search(query: SearchQuery): Promise<SearchOutcome> {
    const url = new URL(API_URL)
    url.searchParams.set('q', query.query)
    url.searchParams.set('count', String(query.maxResults ?? 5))

    const response = await searchRequest(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json', 'x-subscription-token': this.apiKey },
    })
    if (!response.ok) return response

    const body = response.body as BraveResponse
    return {
      ok: true,
      results: (body.web?.results ?? [])
        .filter((item): item is { url: string } & typeof item => typeof item.url === 'string')
        .map((item) => ({
          title: item.title?.trim() || item.url,
          url: item.url,
          domain: domainOf(item.url),
          snippet: (item.description ?? '').replace(/<[^>]+>/g, '').slice(0, 600),
          publishedAt: parseDate(item.age),
        })),
    }
  }
}
