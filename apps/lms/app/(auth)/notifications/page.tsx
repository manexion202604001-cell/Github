import { desc, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { MarkAllReadButton } from '@/components/notifications/MarkAllReadButton'

export const metadata = { title: '通知' }

export default async function NotificationsPage() {
  const user = await requireUser()
  const rows = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100)
  const unread = rows.filter((n) => !n.readAt).length

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        eyebrow="Notifications"
        title="通知"
        description={unread > 0 ? `未読 ${unread} 件` : undefined}
        actions={<MarkAllReadButton disabled={unread === 0} />}
      />
      {rows.length === 0 ? (
        <EmptyState message="通知はまだありません。" action={{ label: 'ダッシュボードへ', href: '/dashboard' }} />
      ) : (
        <ul className="divide-y border-y">
          {rows.map((n) => (
            <NotificationItem key={n.id} n={n} />
          ))}
        </ul>
      )}
    </div>
  )
}
