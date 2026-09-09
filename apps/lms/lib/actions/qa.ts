'use server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { withRls } from '@/lib/db/rls'
import { attachments, courses, lessons, qaReplies, qaThreads, sections } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { checkRateLimit } from '@/lib/rate-limit'
import { awardXp, checkBadges } from '@/lib/gamification'
import { createNotification, sendEmailIfEnabled } from '@/lib/notify'
import { QaAnsweredEmail } from '@/emails/templates'
import { truncate } from '@/lib/utils'

const uuid = z.string().uuid()
const imagePaths = z.array(z.string().min(1).max(300)).max(3)

const createSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください。').max(120, 'タイトルは 120 文字以内にしてください。'),
  bodyMd: z.string().trim().min(1, '本文を入力してください。').max(20_000, '本文は 20,000 文字以内にしてください。'),
  courseId: uuid.nullable().optional(),
  lessonId: uuid.nullable().optional(),
  isPrivate: z.boolean().default(false),
  imagePaths: imagePaths.default([]),
})
export type CreateThreadInput = z.input<typeof createSchema>

/** 添付パスは本人が /api/upload でアップロードしたもの（`${userId}/...`）に限定する */
function ownsAllPaths(userId: string, paths: string[]): boolean {
  return paths.every((p) => p.startsWith(`${userId}/`) && !p.includes('..'))
}

function revalidateThread(threadId: string) {
  revalidatePath('/qa')
  revalidatePath(`/qa/${threadId}`)
  revalidatePath('/admin/qa')
  revalidatePath('/faq')
}

/** QA-01 / QA-08: 質問投稿 */
export async function createThread(input: CreateThreadInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  if (!checkRateLimit(`qa:create:${user.id}`)) return fail(ERR.rateLimited)
  const data = parsed.data
  if (!ownsAllPaths(user.id, data.imagePaths)) return fail(ERR.invalid)

  let courseId = data.courseId ?? null
  const lessonId = data.lessonId ?? null
  if (lessonId) {
    // レッスンからコースを補完し、整合しない組み合わせは弾く
    const row = await db
      .select({ courseId: sections.courseId })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .where(eq(lessons.id, lessonId))
      .then((r) => r[0])
    if (!row) return fail(ERR.notFound)
    if (courseId && courseId !== row.courseId) return fail(ERR.invalid)
    courseId = row.courseId
  }
  if (courseId) {
    const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { id: true, status: true } })
    if (!course || (course.status !== 'published' && !isStaff(user.profile))) return fail(ERR.notFound)
  }

  const thread = await withRls(user.id, async (tx) => {
    const [t] = await tx
      .insert(qaThreads)
      .values({ userId: user.id, courseId, lessonId, title: data.title, bodyMd: data.bodyMd, isPrivate: data.isPrivate })
      .returning({ id: qaThreads.id })
    if (!t) throw new Error('insert failed')
    if (data.imagePaths.length > 0) {
      await tx.insert(attachments).values(data.imagePaths.map((storagePath) => ({ targetType: 'qa_thread', targetId: t.id, storagePath })))
    }
    return t
  })

  try {
    await awardXp(user.id, 'qa_question', { type: 'qa_thread', id: thread.id })
    await checkBadges(user.id)
  } catch (e) {
    console.error('[qa] xp/badge failed', e)
  }
  revalidateThread(thread.id)
  revalidatePath('/dashboard')
  return ok({ id: thread.id })
}

const replySchema = z.object({
  bodyMd: z.string().trim().min(1, '本文を入力してください。').max(20_000, '本文は 20,000 文字以内にしてください。'),
  imagePaths: imagePaths.default([]),
})

/** QA-02 / QA-03: 返信。is_official は role から自動判定。学生は自分のスレッドのみ追加コメント可 */
export async function replyThread(
  threadId: string,
  bodyMd: string,
  opts: { imagePaths?: string[] } = {},
): Promise<ActionResult<{ id: string; isOfficial: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(threadId)
  const parsed = replySchema.safeParse({ bodyMd, imagePaths: opts.imagePaths ?? [] })
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  if (!checkRateLimit(`qa:reply:${user.id}`)) return fail(ERR.rateLimited)
  if (!ownsAllPaths(user.id, parsed.data.imagePaths)) return fail(ERR.invalid)

  const thread = await db.query.qaThreads.findFirst({ where: eq(qaThreads.id, id.data) })
  if (!thread) return fail(ERR.notFound)
  const staff = isStaff(user.profile)
  const owner = thread.userId === user.id
  if (!staff && !owner) return fail('受講生同士の相談はコミュニティの「つまずき相談」をご利用ください。')

  const isOfficial = staff
  const reply = await withRls(user.id, async (tx) => {
    const [r] = await tx
      .insert(qaReplies)
      .values({ threadId: thread.id, userId: user.id, bodyMd: parsed.data.bodyMd, isOfficial })
      .returning({ id: qaReplies.id })
    if (!r) throw new Error('insert failed')
    if (parsed.data.imagePaths.length > 0) {
      await tx.insert(attachments).values(parsed.data.imagePaths.map((storagePath) => ({ targetType: 'qa_reply', targetId: r.id, storagePath })))
    }
    return r
  })

  if (isOfficial) {
    // DB トリガー（on_official_reply）でも answered になるが、Action 側でも明示的に更新する
    if (thread.status === 'open') {
      await db.update(qaThreads).set({ status: 'answered', updatedAt: new Date() }).where(eq(qaThreads.id, thread.id))
    } else {
      await db.update(qaThreads).set({ updatedAt: new Date() }).where(eq(qaThreads.id, thread.id))
    }
    if (!owner) {
      const title = truncate(thread.title, 40)
      try {
        await createNotification({
          userId: thread.userId,
          type: 'qa_reply',
          title: `「${title}」に公式回答がつきました`,
          link: `/qa/${thread.id}`,
        })
        await sendEmailIfEnabled(
          thread.userId,
          'emailQaReply',
          `「${title}」に公式回答がつきました`,
          QaAnsweredEmail({ title: thread.title, threadId: thread.id, replierName: user.profile.displayName }),
        )
      } catch (e) {
        console.error('[qa] notify failed', e)
      }
    }
  } else {
    await db.update(qaThreads).set({ updatedAt: new Date() }).where(eq(qaThreads.id, thread.id))
  }
  revalidateThread(thread.id)
  return ok({ id: reply.id, isOfficial })
}

const statusSchema = z.enum(['open', 'answered', 'resolved'])

/** QA-04: ステータス変更。質問者は resolved のみ、staff は全て */
export async function updateThreadStatus(threadId: string, status: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(threadId)
  const st = statusSchema.safeParse(status)
  if (!id.success || !st.success) return fail(ERR.invalid)
  const thread = await db.query.qaThreads.findFirst({ where: eq(qaThreads.id, id.data) })
  if (!thread) return fail(ERR.notFound)
  const staff = isStaff(user.profile)
  const owner = thread.userId === user.id
  if (!staff && !owner) return fail(ERR.forbidden)
  if (!staff && st.data !== 'resolved') return fail(ERR.forbidden)

  await withRls(user.id, async (tx) => {
    await tx.update(qaThreads).set({ status: st.data, updatedAt: new Date() }).where(eq(qaThreads.id, thread.id))
  })
  revalidateThread(thread.id)
  return ok(undefined)
}

/** QA-05 / ADM-06: FAQ 化のトグル（staff） */
export async function toggleFaq(threadId: string): Promise<ActionResult<{ isFaq: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  if (!isStaff(user.profile)) return fail(ERR.forbidden)
  const id = uuid.safeParse(threadId)
  if (!id.success) return fail(ERR.invalid)
  const thread = await db.query.qaThreads.findFirst({ where: eq(qaThreads.id, id.data) })
  if (!thread) return fail(ERR.notFound)
  const next = !thread.isFaq
  if (next && thread.isPrivate) return fail('非公開の質問は FAQ に追加できません。')
  await withRls(user.id, async (tx) => {
    await tx.update(qaThreads).set({ isFaq: next, updatedAt: new Date() }).where(eq(qaThreads.id, thread.id))
  })
  revalidateThread(thread.id)
  return ok({ isFaq: next })
}

/** ADM-06: 非公開化 / 公開化（staff） */
export async function setThreadPrivate(threadId: string, isPrivate: boolean): Promise<ActionResult<{ isPrivate: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  if (!isStaff(user.profile)) return fail(ERR.forbidden)
  const id = uuid.safeParse(threadId)
  const flag = z.boolean().safeParse(isPrivate)
  if (!id.success || !flag.success) return fail(ERR.invalid)
  const thread = await db.query.qaThreads.findFirst({ where: eq(qaThreads.id, id.data) })
  if (!thread) return fail(ERR.notFound)
  await withRls(user.id, async (tx) => {
    await tx
      .update(qaThreads)
      // 非公開化した場合は FAQ からも外す（FAQ は非 private のみ）
      .set({ isPrivate: flag.data, isFaq: flag.data ? false : thread.isFaq, updatedAt: new Date() })
      .where(eq(qaThreads.id, thread.id))
  })
  revalidateThread(thread.id)
  return ok({ isPrivate: flag.data })
}
