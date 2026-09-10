/**
 * 開発専用プレビューログイン。
 * ローカルに Supabase Auth が無い環境で画面を確認するため、`DEV_PREVIEW_USER_ID` に profiles.id を入れると
 * そのユーザーとしてログイン扱いになる。本番（NODE_ENV=production）では常に無効。
 */
export function devPreviewUserId(): string | null {
  if (process.env.NODE_ENV === 'production') return null
  const id = process.env.DEV_PREVIEW_USER_ID
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null
}
