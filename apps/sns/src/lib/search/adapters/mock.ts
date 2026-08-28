import type { SearchOutcome, SearchProvider, SearchQuery } from '../types'
import { domainOf } from '../url'

/**
 * 検索APIキー未設定時のフォールバック(要件99)。
 * 実在しないURLを事実として見せないため、必ず example.com のデモドメインを使い、
 * 画面側は Demo Mode バッジとともに表示する(要件111: 架空のWebソース表示の禁止)。
 */
const DEMO_SOURCES = [
  {
    path: 'market-overview',
    title: '【デモデータ】業界の市場動向レポート',
    snippet:
      'これはデモ用のサンプル出典です。SEARCH_PROVIDER と APIキーを設定すると、実際のWeb検索結果と出典URLに置き換わります。',
  },
  {
    path: 'customer-voice',
    title: '【デモデータ】利用者アンケートの要約',
    snippet: 'デモ用のサンプル出典です。顧客の悩み・比較検討の観点をまとめた記事を想定しています。',
  },
  {
    path: 'sns-trend',
    title: '【デモデータ】ショート動画のトレンド解説',
    snippet: 'デモ用のサンプル出典です。SNSでの発信テーマの傾向をまとめた記事を想定しています。',
  },
  {
    path: 'competitor-analysis',
    title: '【デモデータ】競合企業のSNS発信まとめ',
    snippet: 'デモ用のサンプル出典です。競合の訴求軸と投稿テーマを整理した記事を想定しています。',
  },
]

export class MockSearchProvider implements SearchProvider {
  readonly id = 'mock'
  readonly synthetic = true

  isConfigured(): boolean {
    return true
  }

  async search(query: SearchQuery): Promise<SearchOutcome> {
    const limit = query.maxResults ?? 4
    return {
      ok: true,
      results: DEMO_SOURCES.slice(0, limit).map((source) => {
        const url = `https://example.com/demo/${source.path}`
        return {
          title: `${source.title}(${query.query})`,
          url,
          domain: domainOf(url),
          snippet: source.snippet,
          publishedAt: null,
        }
      }),
    }
  }
}
