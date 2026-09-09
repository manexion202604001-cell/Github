import { eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { notificationSettings } from '@/lib/db/schema'
import { NotificationSettingsForm } from './NotificationSettingsForm'

export const metadata = { title: '通知設定' }

export default async function NotificationSettingsPage() {
  const user = await requireUser()
  const s = await db.query.notificationSettings.findFirst({ where: eq(notificationSettings.userId, user.id) })
  return (
    <NotificationSettingsForm
      initial={{
        emailQaReply: s?.emailQaReply ?? true,
        emailNewCourse: s?.emailNewCourse ?? true,
        emailOfficeHour: s?.emailOfficeHour ?? true,
        emailMention: s?.emailMention ?? true,
        emailWeeklySummary: s?.emailWeeklySummary ?? false,
      }}
    />
  )
}
