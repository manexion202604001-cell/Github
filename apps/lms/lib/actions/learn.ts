'use server'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { withRls } from '@/lib/db/rls'
import { courses, enrollments, lessonNotes, lessonProgress, lessons, quizAttempts, quizChoices, quizQuestions, quizzes, sections } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { awardXp, onLessonCompleted } from '@/lib/gamification'
import { getCourseLessonOrder, getCompletedLessonIds } from '@/lib/db/queries/learn'
import { gradeQuiz, isLessonUnlocked } from '@/lib/xp'

const uuid = z.string().uuid()

/** LEARN-02: 受講を開始 */
export async function enrollCourse(courseId: string): Promise<ActionResult<{ firstLessonId: string | null }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(courseId)
  if (!id.success) return fail(ERR.invalid)
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id.data) })
  if (!course || (course.status !== 'published' && user.profile.role === 'student')) return fail(ERR.notFound)

  await withRls(user.id, async (tx) => {
    await tx.insert(enrollments).values({ userId: user.id, courseId: id.data }).onConflictDoNothing()
  })
  const order = await getCourseLessonOrder(id.data)
  revalidatePath(`/courses/${course.slug}`)
  revalidatePath('/dashboard')
  return ok({ firstLessonId: order[0] ?? null })
}

const progressSchema = z.object({
  positionSec: z.number().int().min(0).max(60 * 60 * 24).optional(),
  complete: z.boolean().optional(),
})

/** LEARN-03/04/05/08: 進捗保存（再生位置・完了） */
export async function updateLessonProgress(
  lessonId: string,
  input: { positionSec?: number; complete?: boolean },
): Promise<ActionResult<{ completed: boolean; courseCompleted: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(lessonId)
  const parsed = progressSchema.safeParse(input)
  if (!id.success || !parsed.success) return fail(ERR.invalid)

  const ctx = await db
    .select({ lesson: lessons, courseId: sections.courseId, isSequential: courses.isSequential, status: courses.status, slug: courses.slug })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessons.id, id.data))
    .then((r) => r[0])
  if (!ctx) return fail(ERR.notFound)
  if (ctx.status !== 'published' && user.profile.role === 'student') return fail(ERR.notFound)

  const existing = await db.query.lessonProgress.findFirst({
    where: and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, id.data)),
  })
  const alreadyCompleted = existing?.status === 'completed'
  const wantComplete = parsed.data.complete === true && !alreadyCompleted

  if (wantComplete && ctx.isSequential) {
    const order = await getCourseLessonOrder(ctx.courseId)
    const done = await getCompletedLessonIds(user.id, ctx.courseId)
    if (!isLessonUnlocked(true, order, id.data, done)) return fail('前のレッスンを先に完了してください。')
  }
  if (wantComplete && ctx.lesson.type === 'quiz') return fail('小テストは合格すると完了になります。')

  // 受講登録がなければ自動で登録
  await db.insert(enrollments).values({ userId: user.id, courseId: ctx.courseId }).onConflictDoNothing()

  const status = alreadyCompleted || wantComplete ? 'completed' : 'in_progress'
  await withRls(user.id, async (tx) => {
    await tx
      .insert(lessonProgress)
      .values({
        userId: user.id,
        lessonId: id.data,
        status,
        lastPositionSec: parsed.data.positionSec ?? existing?.lastPositionSec ?? 0,
        completedAt: wantComplete ? new Date() : (existing?.completedAt ?? null),
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          status,
          lastPositionSec: parsed.data.positionSec ?? existing?.lastPositionSec ?? 0,
          completedAt: wantComplete ? new Date() : (existing?.completedAt ?? null),
          updatedAt: new Date(),
        },
      })
  })

  let courseCompleted = false
  if (wantComplete) {
    const r = await onLessonCompleted(user.id, id.data)
    courseCompleted = r.courseCompleted
    revalidatePath(`/courses/${ctx.slug}`)
    revalidatePath('/dashboard')
  }
  return ok({ completed: alreadyCompleted || wantComplete, courseCompleted })
}

/** LEARN-11: レッスン内メモ（自動保存） */
export async function saveLessonNote(lessonId: string, bodyMd: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(lessonId)
  const body = z.string().max(20_000).safeParse(bodyMd)
  if (!id.success || !body.success) return fail(ERR.invalid)
  await withRls(user.id, async (tx) => {
    await tx
      .insert(lessonNotes)
      .values({ userId: user.id, lessonId: id.data, bodyMd: body.data })
      .onConflictDoUpdate({ target: [lessonNotes.userId, lessonNotes.lessonId], set: { bodyMd: body.data, updatedAt: new Date() } })
  })
  return ok(undefined)
}

const answersSchema = z.record(z.string().uuid(), z.array(z.string().uuid()).max(20))

/** LEARN-06: 小テスト採点（正解はサーバーのみが知る） */
export async function submitQuiz(
  quizId: string,
  answers: Record<string, string[]>,
): Promise<ActionResult<{ scorePercent: number; passed: boolean; perQuestion: Record<string, boolean>; explanations: Record<string, string | null> }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(quizId)
  const parsed = answersSchema.safeParse(answers)
  if (!id.success || !parsed.success) return fail(ERR.invalid)

  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, id.data) })
  if (!quiz) return fail(ERR.notFound)
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id))
  const allChoices = await db
    .select({ id: quizChoices.id, questionId: quizChoices.questionId, isCorrect: quizChoices.isCorrect })
    .from(quizChoices)
    .innerJoin(quizQuestions, eq(quizQuestions.id, quizChoices.questionId))
    .where(eq(quizQuestions.quizId, quiz.id))

  const graded = gradeQuiz(
    questions.map((q) => ({
      id: q.id,
      isMultiple: q.isMultiple,
      correctChoiceIds: allChoices.filter((c) => c.questionId === q.id && c.isCorrect).map((c) => c.id),
    })),
    parsed.data,
    quiz.passPercent,
  )
  await db.insert(quizAttempts).values({
    quizId: quiz.id,
    userId: user.id,
    scorePercent: graded.scorePercent,
    passed: graded.passed,
    answers: parsed.data,
  })

  if (graded.passed) {
    const existing = await db.query.lessonProgress.findFirst({
      where: and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, quiz.lessonId)),
    })
    if (existing?.status !== 'completed') {
      const ctx = await db
        .select({ courseId: sections.courseId, slug: courses.slug })
        .from(lessons)
        .innerJoin(sections, eq(sections.id, lessons.sectionId))
        .innerJoin(courses, eq(courses.id, sections.courseId))
        .where(eq(lessons.id, quiz.lessonId))
        .then((r) => r[0])
      if (ctx) await db.insert(enrollments).values({ userId: user.id, courseId: ctx.courseId }).onConflictDoNothing()
      await db
        .insert(lessonProgress)
        .values({ userId: user.id, lessonId: quiz.lessonId, status: 'completed', completedAt: new Date() })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: { status: 'completed', completedAt: new Date(), updatedAt: new Date() },
        })
      await awardXp(user.id, 'quiz_pass', { type: 'quiz', id: quiz.id })
      await onLessonCompleted(user.id, quiz.lessonId)
      if (ctx) revalidatePath(`/courses/${ctx.slug}`)
      revalidatePath('/dashboard')
    }
  }
  const explanations: Record<string, string | null> = {}
  for (const q of questions) explanations[q.id] = q.explanation
  return ok({ scorePercent: graded.scorePercent, passed: graded.passed, perQuestion: graded.perQuestion, explanations })
}
