'use server'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { withRls } from '@/lib/db/rls'
import { officeHourAttendance, officeHourQuestionVotes, officeHourQuestions, officeHours } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { checkRateLimit } from '@/lib/rate-limit'
import { awardXp, checkBadges } from '@/lib/gamification'
import { canMarkAttendance, isOfficeHourEnded } from '@/lib/office-hours'

const uuid = z.string().uuid()
const bodySchema = z.string().trim().min(1, '質問を入力してください。').max(1000, '質問は 1000 文字以内で入力してください。')

/** OH-02: 事前質問を投稿 */
export async function submitQuestion(officeHourId: string, body: string): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(officeHourId)
  const parsed = bodySchema.safeParse(body)
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  if (!checkRateLimit(`oh-question:${user.id}`)) return fail(ERR.rateLimited)

  const oh = await db.query.officeHours.findFirst({ where: eq(officeHours.id, id.data) })
  if (!oh) return fail(ERR.notFound)
  if (isOfficeHourEnded(oh.scheduledAt, oh.durationMin)) return fail('このオフィスアワーは終了しています。')

  const [row] = await withRls(user.id, (tx) =>
    tx.insert(officeHourQuestions).values({ officeHourId: id.data, userId: user.id, body: parsed.data }).returning({ id: officeHourQuestions.id }),
  )
  if (!row) return fail(ERR.unknown)
  revalidatePath(`/office-hours/${id.data}`)
  revalidatePath(`/admin/office-hours/${id.data}`)
  return ok({ id: row.id })
}

/** OH-02: 事前質問を削除（本人または staff） */
export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(questionId)
  if (!id.success) return fail(ERR.invalid)
  const q = await db.query.officeHourQuestions.findFirst({ where: eq(officeHourQuestions.id, id.data) })
  if (!q) return fail(ERR.notFound)
  if (q.userId !== user.id && !isStaff(user.profile)) return fail(ERR.forbidden)
  await withRls(user.id, (tx) => tx.delete(officeHourQuestions).where(eq(officeHourQuestions.id, id.data)))
  revalidatePath(`/office-hours/${q.officeHourId}`)
  revalidatePath(`/admin/office-hours/${q.officeHourId}`)
  return ok(undefined)
}

/** OH-02: 「聞きたい」投票（トグル） */
export async function voteQuestion(questionId: string): Promise<ActionResult<{ voted: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(questionId)
  if (!id.success) return fail(ERR.invalid)
  if (!checkRateLimit(`oh-vote:${user.id}`, 30)) return fail(ERR.rateLimited)
  const q = await db.query.officeHourQuestions.findFirst({ where: eq(officeHourQuestions.id, id.data) })
  if (!q) return fail(ERR.notFound)

  const existing = await db.query.officeHourQuestionVotes.findFirst({
    where: and(eq(officeHourQuestionVotes.questionId, id.data), eq(officeHourQuestionVotes.userId, user.id)),
  })
  await withRls(user.id, async (tx) => {
    if (existing) {
      await tx
        .delete(officeHourQuestionVotes)
        .where(and(eq(officeHourQuestionVotes.questionId, id.data), eq(officeHourQuestionVotes.userId, user.id)))
    } else {
      await tx.insert(officeHourQuestionVotes).values({ questionId: id.data, userId: user.id }).onConflictDoNothing()
    }
  })
  revalidatePath(`/office-hours/${q.officeHourId}`)
  revalidatePath(`/admin/office-hours/${q.officeHourId}`)
  return ok({ voted: !existing })
}

/** OH-05: 参加記録（開催時刻の前後 3 時間以内のみ有効）。初回のみ XP 付与 + バッジ判定 */
export async function markAttendance(officeHourId: string): Promise<ActionResult<{ first: boolean; joinUrl: string | null }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(officeHourId)
  if (!id.success) return fail(ERR.invalid)
  const oh = await db.query.officeHours.findFirst({ where: eq(officeHours.id, id.data) })
  if (!oh) return fail(ERR.notFound)
  if (!canMarkAttendance(oh.scheduledAt)) {
    return fail('参加の記録は開催時刻の前後 3 時間のみ可能です。')
  }
  const existing = await db.query.officeHourAttendance.findFirst({
    where: and(eq(officeHourAttendance.officeHourId, id.data), eq(officeHourAttendance.userId, user.id)),
  })
  if (!existing) {
    await withRls(user.id, (tx) =>
      tx.insert(officeHourAttendance).values({ officeHourId: id.data, userId: user.id }).onConflictDoNothing(),
    )
    await awardXp(user.id, 'office_hour_attend', { type: 'office_hour', id: id.data })
    await checkBadges(user.id)
    revalidatePath(`/office-hours/${id.data}`)
    revalidatePath('/office-hours')
    revalidatePath(`/admin/office-hours/${id.data}`)
  }
  return ok({ first: !existing, joinUrl: oh.joinUrl })
}
