import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getOfficeHourDetail } from '@/lib/db/queries/office-hours'
import { updateOfficeHour } from '@/lib/actions/admin/office-hours'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { OfficeHourForm } from '@/components/admin/OfficeHourForm'
import { DeleteOfficeHourButton } from '@/components/admin/DeleteOfficeHourButton'
import { QuestionItem } from '@/components/office-hours/QuestionItem'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'オフィスアワー編集' }

export default async function AdminOfficeHourEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole('instructor')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const detail = await getOfficeHourDetail(id, user.id, true)
  if (!detail) notFound()
  const { officeHour: oh, questions, attendeeCount, isPast } = detail

  return (
    <div className="space-y-12 md:space-y-16">
      <div>
        <Link href="/admin/office-hours" className="caption no-underline">← オフィスアワー管理</Link>
        <PageHeader
          className="mt-4"
          eyebrow="Admin / Office hours"
          title={oh.title}
          description={`${formatDateTime(oh.scheduledAt)} 〜（${oh.durationMin} 分）`}
          actions={
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/office-hours/${oh.id}`}>会員向けページ</Link>
              </Button>
              <DeleteOfficeHourButton id={oh.id} title={oh.title} />
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          {isPast ? <Badge variant="muted">終了</Badge> : <Badge variant="status">予定</Badge>}
          <Badge className="tnum">参加 {attendeeCount ?? 0} 人</Badge>
          <Badge className="tnum">質問 {questions.length} 件</Badge>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        <section>
          <p className="eyebrow mb-1">Edit</p>
          <h2 className="mb-6 text-[22px] md:text-[24px]">予定・録画・要約</h2>
          <OfficeHourForm
            action={updateOfficeHour.bind(null, oh.id)}
            submitLabel="保存"
            initial={{
              title: oh.title,
              theme: oh.theme,
              scheduledAt: oh.scheduledAt.toISOString(),
              durationMin: oh.durationMin,
              joinUrl: oh.joinUrl,
              recordingUrl: oh.recordingUrl,
              summaryMd: oh.summaryMd,
            }}
          />
        </section>

        <section>
          <p className="eyebrow mb-1">Questions</p>
          <h2 className="mb-2 text-[22px] md:text-[24px]">事前質問</h2>
          <p className="caption mb-4">投票数の多い順に表示しています。</p>
          {questions.length === 0 ? (
            <EmptyState message="まだ質問はありません。" />
          ) : (
            <ul className="divide-y border-y">
              {questions.map((q) => (
                <QuestionItem key={q.id} question={q} canDelete canVote={!isPast} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
