'use server'
import { revalidatePath } from 'next/cache'
import { eq, ne, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { categories, courses } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { slugify } from '@/lib/utils'

const uuid = z.string().uuid()
const schema = z.object({
  name: z.string().trim().min(1, 'カテゴリ名を入力してください。').max(60),
  slug: z.string().trim().max(60).regex(/^[a-z0-9-]*$/, 'slug は英小文字・数字・ハイフンのみ使えます。').optional().default(''),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
})

async function staff() {
  const user = await getCurrentUser()
  return user && hasRole(user.profile, 'instructor') ? user : null
}

function revalidate() {
  revalidatePath('/admin/courses')
  revalidatePath('/courses')
}

export async function createCategory(input: z.input<typeof schema>): Promise<ActionResult<{ id: string }>> {
  if (!(await staff())) return fail(ERR.forbidden)
  const parsed = schema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const slug = parsed.data.slug || slugify(parsed.data.name) || `category-${Date.now().toString(36)}`
  const dup = await db.query.categories.findFirst({ where: eq(categories.slug, slug) })
  if (dup) return fail('この slug は既に使われています。')
  const [max] = await db.select({ m: sql<number>`coalesce(max(${categories.sortOrder}), 0)` }).from(categories)
  const [row] = await db
    .insert(categories)
    .values({ name: parsed.data.name, slug, sortOrder: parsed.data.sortOrder ?? Number(max?.m ?? 0) + 1 })
    .returning({ id: categories.id })
  if (!row) return fail(ERR.unknown)
  revalidate()
  return ok(row)
}

export async function updateCategory(categoryId: string, input: z.input<typeof schema>): Promise<ActionResult> {
  if (!(await staff())) return fail(ERR.forbidden)
  const id = uuid.safeParse(categoryId)
  const parsed = schema.safeParse(input)
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const existing = await db.query.categories.findFirst({ where: eq(categories.id, id.data) })
  if (!existing) return fail(ERR.notFound)
  const slug = parsed.data.slug || existing.slug
  const dup = await db.query.categories.findFirst({ where: and(eq(categories.slug, slug), ne(categories.id, existing.id)) })
  if (dup) return fail('この slug は既に使われています。')
  await db
    .update(categories)
    .set({ name: parsed.data.name, slug, sortOrder: parsed.data.sortOrder ?? existing.sortOrder })
    .where(eq(categories.id, existing.id))
  revalidate()
  return ok(undefined)
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  if (!(await staff())) return fail(ERR.forbidden)
  const id = uuid.safeParse(categoryId)
  if (!id.success) return fail(ERR.invalid)
  const [used] = await db.select({ n: sql<number>`count(*)` }).from(courses).where(eq(courses.categoryId, id.data))
  if (Number(used?.n ?? 0) > 0) return fail('このカテゴリに属するコースがあるため削除できません。')
  await db.delete(categories).where(eq(categories.id, id.data))
  revalidate()
  return ok(undefined)
}
