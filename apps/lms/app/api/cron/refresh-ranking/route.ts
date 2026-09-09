import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GAME-03: ランキング materialized view の refresh（Vercel Cron） */
export async function GET(req: Request) {
  const denied = verifyCronSecret(req)
  if (denied) return denied
  try {
    await db.execute(sql`select public.refresh_rankings()`)
    return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[cron:refresh-ranking] failed', e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
