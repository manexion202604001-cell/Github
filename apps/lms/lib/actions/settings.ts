'use server'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { withRls } from '@/lib/db/rls'
import { notificationSettings, profiles } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { createNotification } from '@/lib/notify'
import { publicUrl } from '@/lib/storage'

const profileSchema = z.object({
  displayName: z.string().trim().min(1, '表示名を入力してください。').max(40, '表示名は 40 文字以内にしてください。'),
  bio: z.string().trim().max(200, '自己紹介は 200 文字以内にしてください。').transform((v) => v || null),
  level: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  isPublic: z.boolean(),
  hideFromRanking: z.boolean(),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https:\/\//.test(v), 'アバター画像の URL が不正です。')
    .transform((v) => v || null),
})

/** AUTH-04: プロフィール更新（role は変更不可） */
export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const levelRaw = String(formData.get('level') ?? '')
  const parsed = profileSchema.safeParse({
    displayName: formData.get('displayName') ?? '',
    bio: formData.get('bio') ?? '',
    level: levelRaw === '' ? null : levelRaw,
    isPublic: formData.get('isPublic') === 'on',
    hideFromRanking: formData.get('hideFromRanking') === 'on',
    avatarUrl: formData.get('avatarUrl') ?? '',
  })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  // アバターは自分のアップロード先（avatars/<userId>/...）のみ受け付ける
  if (parsed.data.avatarUrl && !parsed.data.avatarUrl.startsWith(publicUrl('avatars', `${user.id}/`))) {
    return fail('アバター画像の URL が不正です。')
  }
  await withRls(user.id, (tx) => tx.update(profiles).set(parsed.data).where(eq(profiles.id, user.id)))
  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')
  return ok(undefined)
}

const settingsSchema = z.object({
  emailQaReply: z.boolean(),
  emailNewCourse: z.boolean(),
  emailOfficeHour: z.boolean(),
  emailMention: z.boolean(),
  emailWeeklySummary: z.boolean(),
})
export type NotificationSettingsInput = z.infer<typeof settingsSchema>

/** §5.8: メール通知設定（5 項目） */
export async function updateNotificationSettings(input: NotificationSettingsInput): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return fail(ERR.invalid)
  await withRls(user.id, (tx) =>
    tx
      .insert(notificationSettings)
      .values({ userId: user.id, ...parsed.data })
      .onConflictDoUpdate({ target: notificationSettings.userId, set: parsed.data }),
  )
  revalidatePath('/settings/notifications')
  return ok(undefined)
}

/** AUTH-06: 退会申請（管理者承認待ち）。全 admin にアプリ内通知 */
export async function requestDeletion(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  if (user.profile.deletionRequestedAt) return ok(undefined)
  await withRls(user.id, (tx) => tx.update(profiles).set({ deletionRequestedAt: new Date() }).where(eq(profiles.id, user.id)))
  const admins = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.role, 'admin'), isNull(profiles.deletedAt)))
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        type: 'system',
        title: '退会申請がありました',
        body: `${user.profile.displayName} さんから退会申請がありました。`,
        link: '/admin/members',
      }),
    ),
  )
  revalidatePath('/settings/account')
  return ok(undefined)
}

/** AUTH-06: 退会申請の取り消し */
export async function cancelDeletionRequest(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  await withRls(user.id, (tx) => tx.update(profiles).set({ deletionRequestedAt: null }).where(eq(profiles.id, user.id)))
  revalidatePath('/settings/account')
  return ok(undefined)
}
