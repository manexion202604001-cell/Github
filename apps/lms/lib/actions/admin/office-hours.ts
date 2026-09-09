'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, isStaff, type CurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLogs, officeHours } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'

const uuid = z.string().uuid()
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//.test(v), 'URL は http(s):// から始めてください。')
  .transform((v) => (v === '' ? null : v))

/** JST（`YYYY-MM-DDTHH:mm`、datetime-local の値）を Date に変換する */
function jstToDate(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v)
  if (!m) return null
  const [, y, mo, d, h, mi] = m
  const d2 = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 9, Number(mi)))
  return Number.isNaN(d2.getTime()) ? null : d2
}

const officeHourSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください。').max(120),
  theme: z.string().trim().max(500).transform((v) => v || null),
  scheduledAt: z.string().refine((v) => jstToDate(v) !== null, '開催日時を入力してください。'),
  durationMin: z.coerce.number().int().min(15, '開催時間は 15 分以上にしてください。').max(480),
  joinUrl: optionalUrl,
  recordingUrl: optionalUrl,
  summaryMd: z.string().max(50_000).transform((v) => v.trim() || null),
})

function readForm(formData: FormData) {
  return officeHourSchema.safeParse({
    title: formData.get('title') ?? '',
    theme: formData.get('theme') ?? '',
    scheduledAt: formData.get('scheduledAt') ?? '',
    durationMin: formData.get('durationMin') ?? 60,
    joinUrl: formData.get('joinUrl') ?? '',
    recordingUrl: formData.get('recordingUrl') ?? '',
    summaryMd: formData.get('summaryMd') ?? '',
  })
}

type StaffCheck = { ok: true; user: CurrentUser } | { ok: false; error: string }

async function requireStaffUser(): Promise<StaffCheck> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: ERR.unauthorized }
  if (!isStaff(user.profile)) return { ok: false, error: ERR.forbidden }
  return { ok: true, user }
}

function revalidateAll(id?: string) {
  revalidatePath('/office-hours')
  revalidatePath('/dashboard')
  revalidatePath('/admin/office-hours')
  if (id) {
    revalidatePath(`/office-hours/${id}`)
    revalidatePath(`/admin/office-hours/${id}`)
  }
}

/** ADM-08: オフィスアワー作成（staff） */
export async function createOfficeHour(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const auth = await requireStaffUser()
  if (!auth.ok) return fail(auth.error)
  const parsed = readForm(formData)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const scheduledAt = jstToDate(parsed.data.scheduledAt)
  if (!scheduledAt) return fail(ERR.invalid)
  const [row] = await db
    .insert(officeHours)
    .values({ ...parsed.data, scheduledAt })
    .returning({ id: officeHours.id })
  if (!row) return fail(ERR.unknown)
  await db.insert(auditLogs).values({ actorId: auth.user.id, action: 'office_hour.create', targetType: 'office_hour', targetId: row.id })
  revalidateAll(row.id)
  redirect(`/admin/office-hours/${row.id}`)
}

/** ADM-08: オフィスアワー更新（staff） */
export async function updateOfficeHour(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const auth = await requireStaffUser()
  if (!auth.ok) return fail(auth.error)
  const idp = uuid.safeParse(id)
  if (!idp.success) return fail(ERR.invalid)
  const parsed = readForm(formData)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const scheduledAt = jstToDate(parsed.data.scheduledAt)
  if (!scheduledAt) return fail(ERR.invalid)
  const existing = await db.query.officeHours.findFirst({ where: eq(officeHours.id, idp.data) })
  if (!existing) return fail(ERR.notFound)
  // 日時が変わった場合はリマインド済みフラグをリセットする（OH-03）
  const rescheduled = existing.scheduledAt.getTime() !== scheduledAt.getTime()
  await db
    .update(officeHours)
    .set({ ...parsed.data, scheduledAt, ...(rescheduled ? { reminded24hAt: null, reminded1hAt: null } : {}) })
    .where(eq(officeHours.id, idp.data))
  await db.insert(auditLogs).values({ actorId: auth.user.id, action: 'office_hour.update', targetType: 'office_hour', targetId: idp.data })
  revalidateAll(idp.data)
  return ok(undefined)
}

/** ADM-08: オフィスアワー削除（staff） */
export async function deleteOfficeHour(id: string): Promise<ActionResult> {
  const auth = await requireStaffUser()
  if (!auth.ok) return fail(auth.error)
  const idp = uuid.safeParse(id)
  if (!idp.success) return fail(ERR.invalid)
  const existing = await db.query.officeHours.findFirst({ where: eq(officeHours.id, idp.data) })
  if (!existing) return fail(ERR.notFound)
  await db.delete(officeHours).where(eq(officeHours.id, idp.data))
  await db.insert(auditLogs).values({ actorId: auth.user.id, action: 'office_hour.delete', targetType: 'office_hour', targetId: idp.data, detail: { title: existing.title } })
  revalidateAll(idp.data)
  redirect('/admin/office-hours')
}
