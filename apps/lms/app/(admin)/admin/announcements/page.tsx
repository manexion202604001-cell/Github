import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { listAnnouncements } from '@/lib/db/queries/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { AnnouncementForm } from '@/components/admin/AnnouncementForm'
import { AnnouncementActions } from '@/components/admin/AnnouncementActions'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'お知らせ' }

/** ADM-10: お知らせ一覧 + 作成（admin のみ） */
export default async function AdminAnnouncementsPage() {
  await requireRole('admin')
  const rows = await listAnnouncements()
  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Announcements" title="お知らせ" description="公開するとダッシュボードに表示され、全会員に通知されます。" />
      <section className="space-y-4">
        <h2 className="text-[20px]">一覧</h2>
        {rows.length === 0 ? (
          <p className="caption">お知らせはまだありません。</p>
        ) : (
          <ul className="divide-y border-y">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/announcements/${a.id}`} className="font-serif text-[16px] no-underline hover:text-bronze-500">{a.title}</Link>
                    <Badge variant={a.publishedAt ? 'status' : 'muted'}>{a.publishedAt ? '公開中' : '下書き'}</Badge>
                  </div>
                  <p className="caption tnum mt-1">
                    {a.publishedAt ? `公開: ${formatDate(a.publishedAt)}` : `作成: ${formatDate(a.createdAt)}`}
                    {a.authorName ? ` · ${a.authorName}` : ''}
                  </p>
                </div>
                <AnnouncementActions id={a.id} published={!!a.publishedAt} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="max-w-prose space-y-4">
        <h2 className="text-[20px]">新しいお知らせ</h2>
        <AnnouncementForm />
      </section>
    </div>
  )
}
