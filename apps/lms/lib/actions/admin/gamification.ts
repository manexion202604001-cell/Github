'use server'
import { revalidatePath } from 'next/cache'
import { eq, ne, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { badges, xpRules } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { XP_ACTIONS, parseBadgeCriteria } from '@/lib/xp'
import { slugify } from '@/lib/utils'

const uuid = z.string().uuid()

async function admin() {
  const user = await getCurrentUser()
  return user && hasRole(user.profile, 'admin') ? user : null
}

function revalidate() {
  revalidatePath('/admin/badges')
  revalidatePath('/badges')
}

// ---------- XP ----------

const xpSchema = z.object({
  action: z.enum(XP_ACTIONS),
  xp: z.coerce.number().int().min(0).max(10_000),
  dailyCap: z.coerce.number().int().min(1).max(100_000).nullable(),
})

/** ADM-09: XP ルール更新 */
export async function updateXpRule(action: string, xp: number, dailyCap: number | null): Promise<ActionResult> {
  if (!(await admin())) return fail(ERR.forbidden)
  const parsed = xpSchema.safeParse({ action, xp, dailyCap })
  if (!parsed.success) return fail(ERR.invalid)
  const d = parsed.data
  await db
    .insert(xpRules)
    .values({ action: d.action, xp: d.xp, dailyCap: d.dailyCap })
    .onConflictDoUpdate({ target: xpRules.action, set: { xp: d.xp, dailyCap: d.dailyCap } })
  revalidate()
  return ok(undefined)
}

// ---------- バッジ ----------

const badgeSchema = z.object({
  name: z.string().trim().min(1, 'バッジ名を入力してください。').max(60),
  slug: z.string().trim().max(60).regex(/^[a-z0-9-]*$/, 'slug は英小文字・数字・ハイフンのみ使えます。').optional().default(''),
  description: z.string().trim().max(300).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
  criteria: z.unknown(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
})
export type BadgeInput = z.input<typeof badgeSchema>

export async function createBadge(input: BadgeInput): Promise<ActionResult<{ id: string }>> {
  if (!(await admin())) return fail(ERR.forbidden)
  const parsed = badgeSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const criteria = parseBadgeCriteria(parsed.data.criteria)
  if (!criteria) return fail('獲得条件を正しく設定してください。')
  const slug = parsed.data.slug || slugify(parsed.data.name) || `badge-${Date.now().toString(36)}`
  const dup = await db.query.badges.findFirst({ where: eq(badges.slug, slug) })
  if (dup) return fail('この slug は既に使われています。')
  const [max] = await db.select({ m: sql<number>`coalesce(max(${badges.sortOrder}), 0)` }).from(badges)
  const [row] = await db
    .insert(badges)
    .values({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      criteria,
      sortOrder: parsed.data.sortOrder ?? Number(max?.m ?? 0) + 1,
    })
    .returning({ id: badges.id })
  if (!row) return fail(ERR.unknown)
  revalidate()
  return ok(row)
}

export async function updateBadge(badgeId: string, input: BadgeInput): Promise<ActionResult> {
  if (!(await admin())) return fail(ERR.forbidden)
  const id = uuid.safeParse(badgeId)
  const parsed = badgeSchema.safeParse(input)
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const criteria = parseBadgeCriteria(parsed.data.criteria)
  if (!criteria) return fail('獲得条件を正しく設定してください。')
  const existing = await db.query.badges.findFirst({ where: eq(badges.id, id.data) })
  if (!existing) return fail(ERR.notFound)
  const slug = parsed.data.slug || existing.slug
  const dup = await db.query.badges.findFirst({ where: and(eq(badges.slug, slug), ne(badges.id, existing.id)) })
  if (dup) return fail('この slug は既に使われています。')
  await db
    .update(badges)
    .set({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      criteria,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
    })
    .where(eq(badges.id, existing.id))
  revalidate()
  return ok(undefined)
}

export async function deleteBadge(badgeId: string): Promise<ActionResult> {
  if (!(await admin())) return fail(ERR.forbidden)
  const id = uuid.safeParse(badgeId)
  if (!id.success) return fail(ERR.invalid)
  await db.delete(badges).where(eq(badges.id, id.data))
  revalidate()
  return ok(undefined)
}
