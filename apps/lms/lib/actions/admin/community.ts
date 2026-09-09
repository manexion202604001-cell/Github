'use server'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, hasRole, type CurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLogs, channels, reports } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { slugify } from '@/lib/utils'

const uuid = z.string().uuid()
const channelInput = z.object({
  name: z.string().trim().min(1, 'チャンネル名を入力してください。').max(40, 'チャンネル名は 40 文字以内にしてください。'),
  description: z.string().trim().max(300, '説明は 300 文字以内にしてください。').transform((v) => v || null),
})

function firstIssue(e: z.ZodError): string {
  return e.issues[0]?.message ?? ERR.invalid
}

async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser()
  if (!user || !hasRole(user.profile, 'admin')) return null
  return user
}

function revalidateAll() {
  revalidatePath('/admin/community')
  revalidatePath('/community')
}

/** ADM-07 / COM-01: チャンネル作成（slug は名前から自動生成。重複時は連番） */
export async function createChannel(input: { name: string; description?: string }): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireAdmin()
  if (!user) return fail(ERR.forbidden)
  const parsed = channelInput.safeParse({ name: input.name, description: input.description ?? '' })
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const existing = await db.select({ slug: channels.slug, sortOrder: channels.sortOrder }).from(channels)
  const base = slugify(parsed.data.name) || `channel-${Date.now().toString(36)}`
  let slug = base
  for (let i = 2; existing.some((c) => c.slug === slug); i += 1) slug = `${base}-${i}`
  const sortOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1

  const [row] = await db.insert(channels).values({ slug, name: parsed.data.name, description: parsed.data.description, sortOrder }).returning({ id: channels.id })
  if (!row) return fail(ERR.unknown)
  await db.insert(auditLogs).values({ actorId: user.id, action: 'channel.create', targetType: 'channel', targetId: row.id, detail: { name: parsed.data.name, slug } })
  revalidateAll()
  return ok({ id: row.id, slug })
}

/** ADM-07: チャンネル名称・説明の編集 */
export async function updateChannel(channelId: string, input: { name: string; description?: string }): Promise<ActionResult> {
  const user = await requireAdmin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(channelId)
  const parsed = channelInput.safeParse({ name: input.name, description: input.description ?? '' })
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const channel = await db.query.channels.findFirst({ where: eq(channels.id, id.data) })
  if (!channel) return fail(ERR.notFound)
  await db.update(channels).set({ name: parsed.data.name, description: parsed.data.description }).where(eq(channels.id, channel.id))
  await db.insert(auditLogs).values({ actorId: user.id, action: 'channel.update', targetType: 'channel', targetId: channel.id, detail: parsed.data })
  revalidateAll()
  revalidatePath(`/community/${channel.slug}`)
  return ok(undefined)
}

/** ADM-07: 並び替え（上下 1 つ入れ替え） */
export async function moveChannel(channelId: string, direction: 'up' | 'down'): Promise<ActionResult> {
  const user = await requireAdmin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(channelId)
  if (!id.success || (direction !== 'up' && direction !== 'down')) return fail(ERR.invalid)

  const list = await db.select({ id: channels.id }).from(channels).orderBy(asc(channels.sortOrder), asc(channels.name))
  const idx = list.findIndex((c) => c.id === id.data)
  if (idx < 0) return fail(ERR.notFound)
  const swap = direction === 'up' ? idx - 1 : idx + 1
  if (swap < 0 || swap >= list.length) return ok(undefined)
  const order = list.map((c) => c.id)
  ;[order[idx], order[swap]] = [order[swap] as string, order[idx] as string]
  await db.transaction(async (tx) => {
    for (const [i, cid] of order.entries()) await tx.update(channels).set({ sortOrder: i }).where(eq(channels.id, cid))
  })
  revalidateAll()
  return ok(undefined)
}

/** ADM-07: チャンネル削除（投稿はカスケード削除される） */
export async function deleteChannel(channelId: string): Promise<ActionResult> {
  const user = await requireAdmin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(channelId)
  if (!id.success) return fail(ERR.invalid)
  const channel = await db.query.channels.findFirst({ where: eq(channels.id, id.data) })
  if (!channel) return fail(ERR.notFound)
  await db.delete(channels).where(eq(channels.id, channel.id))
  await db.insert(auditLogs).values({ actorId: user.id, action: 'channel.delete', targetType: 'channel', targetId: channel.id, detail: { name: channel.name, slug: channel.slug } })
  revalidateAll()
  return ok(undefined)
}

/** ADM-07 / COM-07: 通報を解決済みにする（対象は変更しない） */
export async function resolveReport(reportId: string): Promise<ActionResult> {
  const user = await requireAdmin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(reportId)
  if (!id.success) return fail(ERR.invalid)
  const report = await db.query.reports.findFirst({ where: eq(reports.id, id.data) })
  if (!report) return fail(ERR.notFound)
  await db.update(reports).set({ resolvedAt: new Date() }).where(and(eq(reports.id, report.id), isNull(reports.resolvedAt)))
  await db.insert(auditLogs).values({ actorId: user.id, action: 'report.resolve', targetType: report.targetType, targetId: report.targetId, detail: { reportId: report.id } })
  revalidatePath('/admin/community')
  return ok(undefined)
}
