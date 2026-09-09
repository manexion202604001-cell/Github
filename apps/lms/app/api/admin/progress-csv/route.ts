import { NextResponse } from 'next/server'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { getProgressMatrix } from '@/lib/db/queries/members'
import { formatDate, toJstDateString } from '@/lib/utils'

function cell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** ADM-05: 受講状況 CSV（UTF-8 BOM 付き、admin のみ） */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  if (!hasRole(user.profile, 'admin')) return NextResponse.json({ error: '権限がありません。' }, { status: 403 })

  const m = await getProgressMatrix({ includeEmail: true })
  const header = ['表示名', 'メール', '最終ログイン', ...m.courses.flatMap((c) => [`${c.title} 進捗率(%)`, `${c.title} 完了日`])]
  const lines = [header.map(cell).join(',')]
  for (const mem of m.members) {
    const row = [mem.displayName, mem.email, mem.lastLoginAt ? formatDate(mem.lastLoginAt) : '']
    for (const c of m.courses) {
      const p = mem.progress[c.id]
      row.push(p ? String(p.progress) : '0', p?.completedAt ? formatDate(p.completedAt) : '')
    }
    lines.push(row.map(cell).join(','))
  }
  const body = `\uFEFF${lines.join('\r\n')}\r\n`
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="progress-${toJstDateString()}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
