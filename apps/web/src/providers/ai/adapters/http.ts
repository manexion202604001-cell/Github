import { providerError, type ProviderError } from '../../types'

export type HttpJsonResult =
  | { ok: true; body: unknown }
  | { ok: false; error: ProviderError }

const DEFAULT_TIMEOUT_MS = 120_000

export async function postJson(
  provider: string,
  url: string,
  init: { headers: Record<string, string>; body: unknown; timeoutMs?: number },
): Promise<HttpJsonResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...init.headers },
      body: JSON.stringify(init.body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return { ok: false, error: providerError(provider, kindForStatus(response.status), `HTTP ${response.status}: ${detail.slice(0, 500)}`) }
    }

    return { ok: true, body: await response.json() }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: providerError(provider, 'TIMEOUT', 'リクエストがタイムアウトしました', error) }
    }
    return { ok: false, error: providerError(provider, 'NETWORK', errorMessage(error), error) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * GETは冪等なので、一時的な失敗(429/5xx・接続断)は自動で再試行する。
 * タイムアウトは再試行しない(60秒設定のProviderで合計時間が跳ね上がるため)。
 */
export async function getJson(
  provider: string,
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 30_000,
  retries = 2,
): Promise<HttpJsonResult> {
  let lastError: ProviderError | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)))

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { headers, signal: controller.signal })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        const error = providerError(provider, kindForStatus(response.status), `HTTP ${response.status}: ${detail.slice(0, 300)}`)
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          lastError = error
          continue
        }
        return { ok: false, error }
      }
      return { ok: true, body: await response.json() }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { ok: false, error: providerError(provider, 'TIMEOUT', 'リクエストがタイムアウトしました', error) }
      }
      lastError = providerError(provider, 'NETWORK', errorMessage(error), error)
      if (attempt >= retries) return { ok: false, error: lastError }
    } finally {
      clearTimeout(timer)
    }
  }

  return { ok: false, error: lastError ?? providerError(provider, 'UNKNOWN', '再試行上限に達しました') }
}

function kindForStatus(status: number) {
  if (status === 401 || status === 403) return 'AUTH' as const
  if (status === 429) return 'RATE_LIMIT' as const
  if (status >= 500) return 'NETWORK' as const
  return 'UNKNOWN' as const
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
