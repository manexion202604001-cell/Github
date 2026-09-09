import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notifications, notificationSettings, profiles } from '@/lib/db/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import type { ReactElement } from 'react'

export type NotificationType = 'qa_reply' | 'mention' | 'badge' | 'course_complete' | 'announcement' | 'report' | 'unanswered' | 'system'

/** アプリ内通知を作成する */
export async function createNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
}) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  })
}

type EmailSettingKey = keyof Omit<typeof notificationSettings.$inferSelect, 'userId'>

/** ユーザーのメールアドレスを取得（service role 経由。クライアントには渡さない） */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(userId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

/** 通知設定に従ってメールを送る（設定 OFF なら送らない） */
export async function sendEmailIfEnabled(userId: string, setting: EmailSettingKey | null, subject: string, react: ReactElement) {
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId), columns: { deletedAt: true } })
  if (!profile || profile.deletedAt) return
  if (setting) {
    const s = await db.query.notificationSettings.findFirst({ where: eq(notificationSettings.userId, userId) })
    if (s && !s[setting]) return
  }
  const email = await getUserEmail(userId)
  if (!email) return
  await sendEmail({ to: email, subject, react })
}
