import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarPlus } from 'lucide-react'
import { requireUser, isStaff } from '@/lib/auth'
import { getOfficeHourDetail } from '@/lib/db/queries/office-hours'
import { extractYouTubeId, youtubeEmbedUrl } from '@/lib/youtube'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Markdown } from '@/components/ui/Markdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendButton } from '@/components/office-hours/AttendButton'
import { QuestionForm } from '@/components/office-hours/QuestionForm'
import { QuestionItem } from '@/components/office-hours/QuestionItem'
import { formatDateTime } from '@/lib/utils'
import { canMarkAttendance } from '@/lib/office-hours'
import { db } from '@/lib/db'
import { officeHours } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: 'オフィスアワー' }
  const oh = await db.query.officeHours.findFirst({ where: eq(officeHours.id, id), columns: { title: true } })
  return { title: oh?.title ?? 'オフィスアワー' }
}

export default async function OfficeHourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const staff = isStaff(user.profile)
  const now = new Date()
  const detail = await getOfficeHourDetail(id, user.id, staff, now)
  if (!detail) notFound()
  const { officeHour: oh, questions, attended, attendeeCount, isPast } = detail
  const canAttend = canMarkAttendance(oh.scheduledAt, now)
  const videoId = isPast ? extractYouTubeId(oh.recordingUrl) : null

  return (
    <div className="space-y-12 md:space-y-16">
      <div>
        <Link href="/office-hours" className="caption no-underline">← オフィスアワー一覧</Link>
        <PageHeader
          className="mt-4"
          eyebrow={isPast ? 'Archive' : 'Office hour'}
          title={oh.title}
          description={oh.theme ?? undefined}
          actions={
            !isPast ? (
              <>
                <AttendButton officeHourId={oh.id} joinUrl={oh.joinUrl} canAttend={canAttend} attended={attended} />
                <Button variant="outline" asChild>
                  <a href={`/api/office-hours/${oh.id}/ics`} download>
                    <CalendarPlus /> カレンダーに追加
                  </a>
                </Button>
              </>
            ) : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="caption tnum">{formatDateTime(oh.scheduledAt)} 〜（{oh.durationMin} 分）</span>
          {attended && <Badge variant="status">参加済み</Badge>}
          {staff && attendeeCount != null && <Badge variant="muted" className="tnum">参加 {attendeeCount} 人</Badge>}
          {staff && (
            <Link href={`/admin/office-hours/${oh.id}`} className="caption">管理画面で編集</Link>
          )}
        </div>
      </div>

      {isPast && (
        <section className="space-y-8">
          <p className="eyebrow">Recording</p>
          {videoId ? (
            <div className="aspect-video w-full max-w-[960px] bg-ink-900">
              <iframe
                src={youtubeEmbedUrl(videoId)}
                title={`${oh.title} の録画`}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : oh.recordingUrl ? (
            <p className="text-[15px]">
              録画はこちら：<a href={oh.recordingUrl} target="_blank" rel="noopener noreferrer">{oh.recordingUrl}</a>
            </p>
          ) : (
            <p className="text-[15px] text-stone-500">録画は準備中です。</p>
          )}
          {oh.summaryMd && (
            <div>
              <p className="eyebrow mb-3">Summary</p>
              <Markdown>{oh.summaryMd}</Markdown>
            </div>
          )}
        </section>
      )}

      <section className="space-y-8">
        <div>
          <p className="eyebrow mb-1">Questions</p>
          <h2 className="text-[22px] md:text-[24px]">事前質問</h2>
          <p className="caption mt-1">投票の多い質問から当日取り上げます。</p>
        </div>
        {!isPast && (
          <div className="max-w-[720px]">
            <QuestionForm officeHourId={oh.id} />
          </div>
        )}
        {questions.length === 0 ? (
          <EmptyState message="まだ質問はありません。" />
        ) : (
          <ul className="max-w-[720px] divide-y border-y">
            {questions.map((q) => (
              <QuestionItem key={q.id} question={q} canDelete={q.userId === user.id || staff} canVote={!isPast} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
