'use client'

/** クライアント用の薄いAPIラッパ。エラーは { code, message } に正規化する。 */
export type ApiError = { code: string; message: string }

export async function api<T>(
  path: string,
  init?: Omit<RequestInit, 'body'> & { body?: unknown },
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // 空ボディ
  }

  if (!response.ok) {
    const error = (payload as { error?: ApiError } | null)?.error
    throw Object.assign(new Error(error?.message ?? `HTTP ${response.status}`), {
      code: error?.code ?? 'HTTP_ERROR',
    })
  }
  return (payload as { data: T }).data
}
