import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { listAllOfficeHoursForAdmin } from '@/lib/db/queries/office-hours'
import { createOfficeHour } from '@/lib/actions/admin/office-hours'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, Th, Td } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { OfficeHourForm } from '@/components/admin/OfficeHourForm'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'オフィスアワー管理' }

export default async function AdminOfficeHoursPage() {
  await requireRole('instructor')
  const rows = await listAllOfficeHoursForAdmin()
  const now = Date.now()

  return (
    <div className="space-y-12 md:space-y-16">
      <PageHeader eyebrow="Admin / Office hours" title="オフィスアワー管理" description="予定の作成、事前質問の確認、録画 URL と要約の登録を行います。" />

      <section>
        <p className="eyebrow mb-3">Schedule</p>
        {rows.length === 0 ? (
          <EmptyState message="オフィスアワーはまだ登録されていません。" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>開催日時</Th>
                <Th>タイトル</Th>
                <Th>状態</Th>
                <Th className="text-right">質問</Th>
                <Th className="text-right">参加</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ended = r.scheduledAt.getTime() + r.durationMin * 60_000 < now
                return (
                  <tr key={r.id}>
                    <Td className="tnum whitespace-nowrap">{formatDateTime(r.scheduledAt)}</Td>
                    <Td>
                      <Link href={`/admin/office-hours/${r.id}`} className="no-underline hover:text-bronze-500">{r.title}</Link>
                    </Td>
                    <Td>
                      {!ended ? (
                        <Badge variant="status">予定</Badge>
                      ) : r.recordingUrl ? (
                        <Badge variant="muted">録画あり</Badge>
                      ) : (
                        <Badge>終了・録画未登録</Badge>
                      )}
                    </Td>
                    <Td className="tnum text-right">{r.questionCount}</Td>
                    <Td className="tnum text-right">{r.attendeeCount}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </section>

      <section className="max-w-[720px]">
        <p className="eyebrow mb-1">New</p>
        <h2 className="mb-6 text-[22px] md:text-[24px]">新しい予定を作成</h2>
        <OfficeHourForm action={createOfficeHour} submitLabel="作成" showArchiveFields={false} />
      </section>
    </div>
  )
}
