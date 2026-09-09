import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getAnnouncement } from '@/lib/db/queries/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Markdown } from '@/components/ui/Markdown'
import { AnnouncementForm } from '@/components/admin/AnnouncementForm'
import { AnnouncementActions } from '@/components/admin/AnnouncementActions'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'お知らせ編集' }

export default async function AdminAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const a = await getAnnouncement(id)
  if (!a) notFound()
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Announcements"
        title={a.title}
        description={a.publishedAt ? `公開: ${formatDateTime(a.publishedAt)}` : '下書き'}
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <Badge variant={a.publishedAt ? 'status' : 'muted'}>{a.publishedAt ? '公開中' : '下書き'}</Badge>
              <Link href="/admin/announcements" className="caption">一覧へ</Link>
            </div>
            <AnnouncementActions id={a.id} published={!!a.publishedAt} />
          </div>
        }
      />
      <div className="grid gap-12 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-[20px]">編集</h2>
          <AnnouncementForm announcement={a} />
        </section>
        <section className="space-y-4">
          <h2 className="text-[20px]">プレビュー</h2>
          <div className="rounded border bg-paper-200 p-6">
            <Markdown>{a.bodyMd}</Markdown>
          </div>
        </section>
      </div>
    </div>
  )
}
