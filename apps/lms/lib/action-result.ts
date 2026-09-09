export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}
export function fail<T = undefined>(error: string): ActionResult<T> {
  return { ok: false, error }
}

export const ERR = {
  unauthorized: 'ログインが必要です。',
  forbidden: 'この操作を行う権限がありません。',
  notFound: '対象が見つかりません。',
  invalid: '入力内容を確認してください。',
  rateLimited: '操作が多すぎます。少し時間をおいてから再度お試しください。',
  unknown: '処理に失敗しました。時間をおいて再度お試しください。',
} as const
