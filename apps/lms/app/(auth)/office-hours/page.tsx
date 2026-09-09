import Link from 'next/link'
import { CalendarPlus, PlayCircle } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { officeHourAttendance } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getNextOfficeHour, listPastOfficeHours, listUpcomingOfficeHours } from '@/lib/db/queries/office-hours'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendButton } from '@/components/office-hours/AttendButton'
import { formatDate, formatDateTime } from '@/lib/utils'
import { canMarkAttendance } from '@/lib/office-hours'

export const metadata = { title: 'オフィスアワー' }

export default async function OfficeHoursPage() {
  const user = await requireUser()
  const now = new Date()
  const [next, upcoming, past] = await Promise.all([getNextOfficeHour(now), listUpcomingOfficeHours(now), listPastOfficeHours(now)])
  const attended = next
    ? await db.query.officeHourAttendance.findFirst({
        where: and(eq(officeHourAttendance.officeHourId, next.id), eq(officeHourAttendance.userId, user.id)),
      })
    : null
  const canAttend = next ? canMarkAttendance(next.scheduledAt, now) : false
  const others = upcoming.filter((o) => o.id !== next?.id)

  return (
    <div className="space-y-12 md:space-y-16">
      <PageHeader eyebrow="Office hour" title="オフィスアワー" description="月に一度、講師とライブで話せる時間です。事前質問を集め、投票の多いものから取り上げます。" />

      <section>
        <p className="eyebrow mb-3">Next</p>
        {next ? (
          <Card tone="dark" className="space-y-6">
            <div>
              <p className="caption tnum text-stone-300">{formatDateTime(next.scheduledAt)} 〜（{next.durationMin} 分）</p>
              <CardTitle className="mt-2 text-[22px] text-paper-100 md:text-[26px]">{next.title}</CardTitle>
              {next.theme && <p className="mt-2 max-w-prose text-[15px] leading-[1.9] text-stone-300">{next.theme}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AttendButton officeHourId={next.id} joinUrl={next.joinUrl} canAttend={canAttend} attended={!!attended} />
              <Button variant="outline" className="border-paper-100/40 text-paper-100 hover:bg-ink-700 hover:text-paper-100" asChild>
                <a href={`/api/office-hours/${next.id}/ics`} download>
                  <CalendarPlus /> カレンダーに追加
                </a>
              </Button>
              <Button variant="ghost" className="text-paper-100 hover:text-bronze-400" asChild>
                <Link href={`/office-hours/${next.id}`}>詳細・事前質問</Link>
              </Button>
            </div>
            {!next.joinUrl && <p className="caption text-stone-400">参加リンクは開催前にお知らせします。</p>}
          </Card>
        ) : (
          <Card tone="dark">
            <CardTitle className="text-paper-100">次回のオフィスアワーは調整中です。</CardTitle>
            <p className="caption mt-1 text-stone-400">日程が決まり次第、ダッシュボードとメールでお知らせします。</p>
          </Card>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <p className="eyebrow mb-3">Upcoming</p>
          <ul className="divide-y border-y">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/office-hours/${o.id}`} className="flex flex-col gap-1 py-4 no-underline hover:text-bronze-500 md:flex-row md:items-center md:justify-between">
                  <span className="font-serif text-[15px]">{o.title}</span>
                  <span className="caption tnum">{formatDateTime(o.scheduledAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="eyebrow mb-3">Archive</p>
        {past.length === 0 ? (
          <EmptyState message="過去の録画はまだありません。" />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {past.map((o) => (
              <li key={o.id}>
                <Link href={`/office-hours/${o.id}`} className="block h-full no-underline hover:text-ink-700">
                  <Card interactive className="flex h-full flex-col">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="status">
                        <PlayCircle className="mr-1 size-3 stroke-[1.5]" /> 録画
                      </Badge>
                      <span className="caption tnum">{formatDate(o.scheduledAt)}</span>
                    </div>
                    <CardTitle>{o.title}</CardTitle>
                    {o.theme && <p className="mt-2 text-[14px] leading-[1.8] text-stone-500">{o.theme}</p>}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
