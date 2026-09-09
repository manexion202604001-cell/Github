import 'server-only'
import { NextResponse } from 'next/server'

/**
 * Cron / Webhook 共通の認証。`Authorization: Bearer ${CRON_SECRET}` を検証する。
 * Supabase Database Webhook も同じシークレットを使う（README に記載）。
 * @returns 認証 NG なら返すべきレスポンス、OK なら null
 */
export function verifyCronSecret(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET が設定されていません。' }, { status: 503 })
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token || !timingSafeEqual(token, secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return null
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
