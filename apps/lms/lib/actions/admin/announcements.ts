'use server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { announcements, profiles } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { createNotification } from '@/lib/notify'

const uuid = z.string().uuid()
const schema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください。').max(120),
  bodyMd: z.string().trim().min(1, '本文を入力してください。').max(20_000),
})

async function admin() {
  const user = await getCurrentUser()
  return user && hasRole(user.profile, 'admin') ? user : null
}

function revalidate(id?: string) {
  revalidatePath('/admin/announcements')
  if (id) revalidatePath(`/admin/announcements/${id}`)
  revalidatePath('/dashboard')
}

/** ADM-10: お知らせ作成（下書き）。publish=true なら即公開 */
export async function createAnnouncement(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const parsed = schema.safeParse({ title: formData.get('title'), bodyMd: formData.get('bodyMd') })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const publish = formData.get('publish') === '1'
  const [row] = await db
    .insert(announcements)
    .values({ title: parsed.data.title, bodyMd: parsed.data.bodyMd, createdBy: user.id, publishedAt: publish ? new Date() : null })
    .returning({ id: announcements.id })
  if (!row) return fail(ERR.unknown)
  if (publish) notifyAll(parsed.data.title)
  revalidate(row.id)
  return ok(row)
}

export async function updateAnnouncement(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const aid = uuid.safeParse(id)
  const parsed = schema.safeParse({ title: formData.get('title'), bodyMd: formData.get('bodyMd') })
  if (!aid.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const existing = await db.query.announcements.findFirst({ where: eq(announcements.id, aid.data) })
  if (!existing) return fail(ERR.notFound)
  await db.update(announcements).set({ title: parsed.data.title, bodyMd: parsed.data.bodyMd }).where(eq(announcements.id, existing.id))
  revalidate(existing.id)
  return ok(undefined)
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const aid = uuid.safeParse(id)
  if (!aid.success) return fail(ERR.invalid)
  await db.delete(announcements).where(eq(announcements.id, aid.data))
  revalidate()
  return ok(undefined)
}

/** 公開（全会員にアプリ内通知） */
export async function publishAnnouncement(id: string): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const aid = uuid.safeParse(id)
  if (!aid.success) return fail(ERR.invalid)
  const existing = await db.query.announcements.findFirst({ where: eq(announcements.id, aid.data) })
  if (!existing) return fail(ERR.notFound)
  if (existing.publishedAt) return ok(undefined)
  await db.update(announcements).set({ publishedAt: new Date() }).where(eq(announcements.id, existing.id))
  notifyAll(existing.title)
  revalidate(existing.id)
  return ok(undefined)
}

export async function unpublishAnnouncement(id: string): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const aid = uuid.safeParse(id)
  if (!aid.success) return fail(ERR.invalid)
  await db.update(announcements).set({ publishedAt: null }).where(eq(announcements.id, aid.data))
  revalidate(aid.data)
  return ok(undefined)
}

function notifyAll(title: string) {
  after(async () => {
    const members = await db.select({ id: profiles.id }).from(profiles).where(isNull(profiles.deletedAt))
    for (const m of members) {
      try {
        await createNotification({ userId: m.id, type: 'announcement', title, link: '/dashboard' })
      } catch (e) {
        console.error('[announcement] notify failed', m.id, e)
      }
    }
  })
}
