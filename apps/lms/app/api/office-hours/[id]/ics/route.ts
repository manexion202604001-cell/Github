import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { officeHours } from '@/lib/db/schema'
import { buildIcs } from '@/lib/ics'
import { appUrl } from '@/lib/utils'

/**
 * GET /api/office-hours/[id]/ics — OH-01: カレンダー用 ICS
 * （REQUIREMENTS §8.2 の `[id].ics` は Next の動的ルート名にできないため `/[id]/ics` とする）
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  const { id } = await ctx.params
  const idp = z.string().uuid().safeParse(id)
  if (!idp.success) return NextResponse.json({ error: '対象が見つかりません。' }, { status: 404 })
  const oh = await db.query.officeHours.findFirst({ where: eq(officeHours.id, idp.data) })
  if (!oh) return NextResponse.json({ error: '対象が見つかりません。' }, { status: 404 })

  const detailUrl = appUrl(`/office-hours/${oh.id}`)
  const description = [oh.theme ? `テーマ: ${oh.theme}` : null, oh.joinUrl ? `参加リンク: ${oh.joinUrl}` : null, `詳細: ${detailUrl}`]
    .filter(Boolean)
    .join('\n')
  const body = buildIcs({
    uid: `office-hour-${oh.id}@studio-n`,
    title: `studio N オフィスアワー: ${oh.title}`,
    description,
    start: oh.scheduledAt,
    durationMin: oh.durationMin,
    url: oh.joinUrl ?? detailUrl,
  })
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="office-hour-${oh.id}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
