import type { SearchOutcome } from '../types'

const TIMEOUT_MS = 20_000
/** 応答サイズの上限。巨大なレスポンスでメモリを食い潰さない(要件67)。 */
const MAX_BYTES = 2_000_000

export type SearchRequestResult = { ok: true; body: unknown } | Extract<SearchOutcome, { ok: false }>

export async function searchRequest(
  url: string,
  init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: unknown },
): Promise<SearchRequestResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500
      return {
        ok: false,
        retryable,
        message:
          response.status === 401 || response.status === 403
            ? '検索サービスの認証に失敗しました。'
            : `検索サービスがエラーを返しました(HTTP ${response.status})。`,
      }
    }

    const text = await response.text()
    if (text.length > MAX_BYTES) {
      return { ok: false, retryable: false, message: '検索結果の応答が大きすぎます。' }
    }

    try {
      return { ok: true, body: JSON.parse(text) }
    } catch {
      return { ok: false, retryable: false, message: '検索サービスの応答を解釈できませんでした。' }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, retryable: true, message: '検索サービスへの接続がタイムアウトしました。' }
    }
    return { ok: false, retryable: true, message: '検索サービスへ接続できませんでした。' }
  } finally {
    clearTimeout(timer)
  }
}
