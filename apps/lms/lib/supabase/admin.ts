import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * service role クライアント。RLS をバイパスする。
 * 使用範囲: 招待受諾（ユーザー作成）/ Cron / Webhook / XP 加算 / 修了証発行 / 署名付き URL 発行 / 管理者操作
 * （CLAUDE.md の制約。ここ以外で SUPABASE_SERVICE_ROLE_KEY を参照しない）
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase の service role が設定されていません。')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
