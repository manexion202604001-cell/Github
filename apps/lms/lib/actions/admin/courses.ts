'use server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, hasRole, type CurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  courses,
  lessonAttachments,
  lessons,
  profiles,
  quizChoices,
  quizQuestions,
  quizzes,
  sections,
  type Course,
  type Lesson,
  type Section,
} from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { createNotification, sendEmailIfEnabled } from '@/lib/notify'
import { NewCourseEmail } from '@/emails/templates'
import { extractYouTubeId } from '@/lib/youtube'
import { slugify } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

const uuid = z.string().uuid()

async function staff(): Promise<CurrentUser | null> {
  const user = await getCurrentUser()
  if (!user || !hasRole(user.profile, 'instructor')) return null
  return user
}

function revalidateCourse(course: Pick<Course, 'id' | 'slug'>) {
  revalidatePath('/admin/courses')
  revalidatePath(`/admin/courses/${course.id}`, 'layout')
  revalidatePath(`/courses/${course.slug}`, 'layout')
  revalidatePath('/courses')
  revalidatePath('/dashboard')
}

// ---------- コース ----------

const goalsInput = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(/\r?\n/)).map((s) => s.trim()).filter(Boolean).slice(0, 20))

const courseSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください。').max(120),
  slug: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9-]*$/, 'slug は英小文字・数字・ハイフンのみ使えます。')
    .optional()
    .default(''),
  description: z.string().trim().max(5000).optional().default(''),
  goals: goalsInput.optional().default([]),
  categoryId: z.string().uuid().nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  thumbnailUrl: z.string().trim().max(500).nullable().optional(),
  durationWeeks: z.coerce.number().int().min(1).max(52).default(2),
  isSequential: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
})
export type CourseInput = z.input<typeof courseSchema>

function fieldError(e: z.ZodError) {
  return e.issues[0]?.message ?? ERR.invalid
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || `course-${Date.now().toString(36)}`
  let candidate = root
  for (let i = 2; i < 100; i++) {
    const hit = await db.query.courses.findFirst({
      where: excludeId ? and(eq(courses.slug, candidate), ne(courses.id, excludeId)) : eq(courses.slug, candidate),
      columns: { id: true },
    })
    if (!hit) return candidate
    candidate = `${root}-${i}`
  }
  return `${root}-${Date.now().toString(36)}`
}

/** ADM-01: コース作成 */
export async function createCourse(input: CourseInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const parsed = courseSchema.safeParse(input)
  if (!parsed.success) return fail(fieldError(parsed.error))
  const d = parsed.data
  const slug = await uniqueSlug(d.slug || slugify(d.title))
  const [max] = await db.select({ m: sql<number>`coalesce(max(${courses.sortOrder}), 0)` }).from(courses)
  const [row] = await db
    .insert(courses)
    .values({
      title: d.title,
      slug,
      description: d.description || null,
      goals: d.goals,
      categoryId: d.categoryId ?? null,
      level: d.level,
      thumbnailUrl: d.thumbnailUrl || null,
      durationWeeks: d.durationWeeks,
      isSequential: d.isSequential,
      status: 'draft',
      sortOrder: d.sortOrder ?? Number(max?.m ?? 0) + 1,
      createdBy: user.id,
    })
    .returning({ id: courses.id, slug: courses.slug })
  if (!row) return fail(ERR.unknown)
  revalidatePath('/admin/courses')
  return ok(row)
}

/** ADM-01: コース更新 */
export async function updateCourse(courseId: string, input: CourseInput): Promise<ActionResult<{ slug: string }>> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(courseId)
  const parsed = courseSchema.safeParse(input)
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(fieldError(parsed.error))
  const existing = await db.query.courses.findFirst({ where: eq(courses.id, id.data) })
  if (!existing) return fail(ERR.notFound)
  const d = parsed.data
  const slug = d.slug && d.slug !== existing.slug ? await uniqueSlug(d.slug, existing.id) : existing.slug
  const status = d.status ?? existing.status
  await db
    .update(courses)
    .set({
      title: d.title,
      slug,
      description: d.description || null,
      goals: d.goals,
      categoryId: d.categoryId ?? null,
      level: d.level,
      thumbnailUrl: d.thumbnailUrl === undefined ? existing.thumbnailUrl : d.thumbnailUrl || null,
      durationWeeks: d.durationWeeks,
      isSequential: d.isSequential,
      status,
      sortOrder: d.sortOrder ?? existing.sortOrder,
      publishedAt: status === 'published' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, existing.id))
  revalidateCourse({ id: existing.id, slug: existing.slug })
  if (slug !== existing.slug) revalidatePath(`/courses/${slug}`, 'layout')
  return ok({ slug })
}

/** ADM-01: コース削除 */
export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(courseId)
  if (!id.success) return fail(ERR.invalid)
  const existing = await db.query.courses.findFirst({ where: eq(courses.id, id.data) })
  if (!existing) return fail(ERR.notFound)
  await db.delete(courses).where(eq(courses.id, existing.id))
  await logAudit({ actorId: user.id, action: 'course.delete', targetType: 'course', targetId: existing.id, detail: { title: existing.title } })
  revalidateCourse(existing)
  return ok(undefined)
}

/** ADM-01: 公開（全会員に通知 + メール） */
export async function publishCourse(courseId: string): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(courseId)
  if (!id.success) return fail(ERR.invalid)
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id.data) })
  if (!course) return fail(ERR.notFound)
  if (course.status === 'published') return ok(undefined)
  const firstPublish = !course.publishedAt
  await db.update(courses).set({ status: 'published', publishedAt: course.publishedAt ?? new Date(), updatedAt: new Date() }).where(eq(courses.id, course.id))
  await logAudit({ actorId: user.id, action: 'course.publish', targetType: 'course', targetId: course.id, detail: { title: course.title } })
  revalidateCourse(course)

  if (firstPublish) {
    const members = await db.select({ id: profiles.id }).from(profiles).where(isNull(profiles.deletedAt))
    const title = `新しいコース「${course.title}」が公開されました`
    const link = `/courses/${course.slug}`
    // 通知・メールはレスポンス後に非同期で回す
    after(async () => {
      for (const m of members) {
        try {
          await createNotification({ userId: m.id, type: 'announcement', title, link })
          await sendEmailIfEnabled(m.id, 'emailNewCourse', title, NewCourseEmail({ title: course.title, slug: course.slug, description: course.description }))
        } catch (e) {
          console.error('[publishCourse] notify failed', m.id, e)
        }
      }
    })
  }
  return ok(undefined)
}

/** ADM-01: 下書きに戻す / アーカイブ */
export async function setCourseStatus(courseId: string, status: 'draft' | 'archived'): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(courseId)
  const st = z.enum(['draft', 'archived']).safeParse(status)
  if (!id.success || !st.success) return fail(ERR.invalid)
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id.data) })
  if (!course) return fail(ERR.notFound)
  await db.update(courses).set({ status: st.data, updatedAt: new Date() }).where(eq(courses.id, course.id))
  revalidateCourse(course)
  return ok(undefined)
}

/** ADM-01: 並び替え */
export async function reorderCourses(ids: string[]): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const parsed = z.array(uuid).min(1).max(500).safeParse(ids)
  if (!parsed.success) return fail(ERR.invalid)
  await db.transaction(async (tx) => {
    for (const [i, cid] of parsed.data.entries()) {
      await tx.update(courses).set({ sortOrder: i + 1 }).where(eq(courses.id, cid))
    }
  })
  revalidatePath('/admin/courses')
  revalidatePath('/courses')
  return ok(undefined)
}

// ---------- セクション ----------

const sectionTitle = z.string().trim().min(1, 'セクション名を入力してください。').max(120)

export async function createSection(courseId: string, title: string): Promise<ActionResult<Section>> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(courseId)
  const t = sectionTitle.safeParse(title)
  if (!id.success) return fail(ERR.invalid)
  if (!t.success) return fail(fieldError(t.error))
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id.data) })
  if (!course) return fail(ERR.notFound)
  const [max] = await db.select({ m: sql<number>`coalesce(max(${sections.sortOrder}), 0)` }).from(sections).where(eq(sections.courseId, course.id))
  const [row] = await db.insert(sections).values({ courseId: course.id, title: t.data, sortOrder: Number(max?.m ?? 0) + 1 }).returning()
  if (!row) return fail(ERR.unknown)
  revalidateCourse(course)
  return ok(row)
}

export async function updateSection(sectionId: string, title: string): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(sectionId)
  const t = sectionTitle.safeParse(title)
  if (!id.success) return fail(ERR.invalid)
  if (!t.success) return fail(fieldError(t.error))
  const sec = await db.query.sections.findFirst({ where: eq(sections.id, id.data) })
  if (!sec) return fail(ERR.notFound)
  await db.update(sections).set({ title: t.data }).where(eq(sections.id, sec.id))
  const course = await db.query.courses.findFirst({ where: eq(courses.id, sec.courseId) })
  if (course) revalidateCourse(course)
  return ok(undefined)
}

export async function deleteSection(sectionId: string): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(sectionId)
  if (!id.success) return fail(ERR.invalid)
  const sec = await db.query.sections.findFirst({ where: eq(sections.id, id.data) })
  if (!sec) return fail(ERR.notFound)
  await db.delete(sections).where(eq(sections.id, sec.id))
  const course = await db.query.courses.findFirst({ where: eq(courses.id, sec.courseId) })
  if (course) revalidateCourse(course)
  return ok(undefined)
}

export async function reorderSections(courseId: string, ids: string[]): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const cid = uuid.safeParse(courseId)
  const parsed = z.array(uuid).min(1).max(500).safeParse(ids)
  if (!cid.success || !parsed.success) return fail(ERR.invalid)
  const course = await db.query.courses.findFirst({ where: eq(courses.id, cid.data) })
  if (!course) return fail(ERR.notFound)
  await db.transaction(async (tx) => {
    for (const [i, sid] of parsed.data.entries()) {
      await tx.update(sections).set({ sortOrder: i + 1 }).where(and(eq(sections.id, sid), eq(sections.courseId, course.id)))
    }
  })
  revalidateCourse(course)
  return ok(undefined)
}

// ---------- レッスン ----------

const lessonSchema = z.object({
  title: z.string().trim().min(1, 'レッスン名を入力してください。').max(120),
  type: z.enum(['video', 'slide', 'text', 'quiz']),
  youtubeVideoId: z.string().trim().max(300).nullable().optional(),
  slideUrl: z.string().trim().max(500).nullable().optional(),
  bodyMd: z.string().max(100_000).nullable().optional(),
  durationMin: z.coerce.number().int().min(0).max(600).nullable().optional(),
})
export type LessonInput = z.input<typeof lessonSchema>

async function lessonContext(lessonId: string) {
  return db
    .select({ lesson: lessons, course: courses })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessons.id, lessonId))
    .then((r) => r[0] ?? null)
}

export async function createLesson(sectionId: string, input: LessonInput): Promise<ActionResult<Lesson>> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const sid = uuid.safeParse(sectionId)
  const parsed = lessonSchema.safeParse(input)
  if (!sid.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(fieldError(parsed.error))
  const sec = await db.query.sections.findFirst({ where: eq(sections.id, sid.data) })
  if (!sec) return fail(ERR.notFound)
  const d = parsed.data
  const yt = d.youtubeVideoId ? extractYouTubeId(d.youtubeVideoId) : null
  if (d.youtubeVideoId && !yt) return fail('YouTube の URL または動画 ID を確認してください。')
  const [max] = await db.select({ m: sql<number>`coalesce(max(${lessons.sortOrder}), 0)` }).from(lessons).where(eq(lessons.sectionId, sec.id))
  const [row] = await db
    .insert(lessons)
    .values({
      sectionId: sec.id,
      title: d.title,
      type: d.type,
      youtubeVideoId: yt,
      slideUrl: d.slideUrl || null,
      bodyMd: d.bodyMd || null,
      durationMin: d.durationMin ?? null,
      sortOrder: Number(max?.m ?? 0) + 1,
    })
    .returning()
  if (!row) return fail(ERR.unknown)
  if (d.type === 'quiz') await db.insert(quizzes).values({ lessonId: row.id }).onConflictDoNothing()
  const course = await db.query.courses.findFirst({ where: eq(courses.id, sec.courseId) })
  if (course) revalidateCourse(course)
  return ok(row)
}

export async function updateLesson(lessonId: string, input: LessonInput): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(lessonId)
  const parsed = lessonSchema.safeParse(input)
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(fieldError(parsed.error))
  const ctx = await lessonContext(id.data)
  if (!ctx) return fail(ERR.notFound)
  const d = parsed.data
  const yt = d.youtubeVideoId ? extractYouTubeId(d.youtubeVideoId) : null
  if (d.type === 'video' && d.youtubeVideoId && !yt) return fail('YouTube の URL または動画 ID を確認してください。')
  await db
    .update(lessons)
    .set({
      title: d.title,
      type: d.type,
      youtubeVideoId: d.type === 'video' ? yt : null,
      slideUrl: d.type === 'slide' ? d.slideUrl || null : null,
      bodyMd: d.bodyMd || null,
      durationMin: d.durationMin ?? null,
    })
    .where(eq(lessons.id, ctx.lesson.id))
  if (d.type === 'quiz') await db.insert(quizzes).values({ lessonId: ctx.lesson.id }).onConflictDoNothing()
  revalidateCourse(ctx.course)
  revalidatePath(`/admin/courses/${ctx.course.id}/lessons/${ctx.lesson.id}`)
  return ok(undefined)
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(lessonId)
  if (!id.success) return fail(ERR.invalid)
  const ctx = await lessonContext(id.data)
  if (!ctx) return fail(ERR.notFound)
  await db.delete(lessons).where(eq(lessons.id, ctx.lesson.id))
  revalidateCourse(ctx.course)
  return ok(undefined)
}

export async function reorderLessons(sectionId: string, ids: string[]): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const sid = uuid.safeParse(sectionId)
  const parsed = z.array(uuid).min(1).max(500).safeParse(ids)
  if (!sid.success || !parsed.success) return fail(ERR.invalid)
  const sec = await db.query.sections.findFirst({ where: eq(sections.id, sid.data) })
  if (!sec) return fail(ERR.notFound)
  await db.transaction(async (tx) => {
    for (const [i, lid] of parsed.data.entries()) {
      await tx.update(lessons).set({ sortOrder: i + 1 }).where(and(eq(lessons.id, lid), eq(lessons.sectionId, sec.id)))
    }
  })
  const course = await db.query.courses.findFirst({ where: eq(courses.id, sec.courseId) })
  if (course) revalidateCourse(course)
  return ok(undefined)
}

/** レッスンを別セクションへ移動（同一コース内のみ）。末尾に追加する */
export async function moveLesson(lessonId: string, sectionId: string): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const lid = uuid.safeParse(lessonId)
  const sid = uuid.safeParse(sectionId)
  if (!lid.success || !sid.success) return fail(ERR.invalid)
  const ctx = await lessonContext(lid.data)
  const target = await db.query.sections.findFirst({ where: eq(sections.id, sid.data) })
  if (!ctx || !target) return fail(ERR.notFound)
  if (target.courseId !== ctx.course.id) return fail('同じコース内のセクションにのみ移動できます。')
  const [max] = await db.select({ m: sql<number>`coalesce(max(${lessons.sortOrder}), 0)` }).from(lessons).where(eq(lessons.sectionId, target.id))
  await db.update(lessons).set({ sectionId: target.id, sortOrder: Number(max?.m ?? 0) + 1 }).where(eq(lessons.id, ctx.lesson.id))
  revalidateCourse(ctx.course)
  return ok(undefined)
}

// ---------- 添付 ----------

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  storagePath: z.string().trim().min(1).max(500),
  sizeBytes: z.number().int().min(0).nullable().optional(),
})

export async function addAttachment(lessonId: string, input: z.input<typeof attachmentSchema>): Promise<ActionResult<{ id: string }>> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(lessonId)
  const parsed = attachmentSchema.safeParse(input)
  if (!id.success || !parsed.success) return fail(ERR.invalid)
  const ctx = await lessonContext(id.data)
  if (!ctx) return fail(ERR.notFound)
  const [row] = await db
    .insert(lessonAttachments)
    .values({ lessonId: ctx.lesson.id, fileName: parsed.data.fileName, storagePath: parsed.data.storagePath, sizeBytes: parsed.data.sizeBytes ?? null })
    .returning({ id: lessonAttachments.id })
  if (!row) return fail(ERR.unknown)
  revalidatePath(`/admin/courses/${ctx.course.id}/lessons/${ctx.lesson.id}`)
  revalidatePath(`/courses/${ctx.course.slug}/lessons/${ctx.lesson.id}`)
  return ok(row)
}

export async function removeAttachment(attachmentId: string): Promise<ActionResult> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(attachmentId)
  if (!id.success) return fail(ERR.invalid)
  const att = await db.query.lessonAttachments.findFirst({ where: eq(lessonAttachments.id, id.data) })
  if (!att) return fail(ERR.notFound)
  await db.delete(lessonAttachments).where(eq(lessonAttachments.id, att.id))
  const ctx = await lessonContext(att.lessonId)
  if (ctx) {
    revalidatePath(`/admin/courses/${ctx.course.id}/lessons/${ctx.lesson.id}`)
    revalidatePath(`/courses/${ctx.course.slug}/lessons/${ctx.lesson.id}`)
  }
  return ok(undefined)
}

// ---------- ADM-03 小テスト ----------

const quizSchema = z.object({
  passPercent: z.coerce.number().int().min(1).max(100),
  questions: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        question: z.string().trim().min(1, '問題文を入力してください。').max(2000),
        explanation: z.string().trim().max(2000).nullable().optional(),
        isMultiple: z.boolean().default(false),
        choices: z
          .array(z.object({ id: z.string().uuid().optional(), label: z.string().trim().min(1, '選択肢を入力してください。').max(500), isCorrect: z.boolean().default(false) }))
          .min(2, '選択肢は 2 つ以上必要です。')
          .max(10),
      }),
    )
    .max(50),
})
export type QuizInput = z.input<typeof quizSchema>

/** ADM-03: 小テスト保存（全体置換。ID を渡した問題/選択肢は ID を維持する） */
export async function upsertQuiz(lessonId: string, input: QuizInput): Promise<ActionResult<{ quizId: string }>> {
  const user = await staff()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(lessonId)
  const parsed = quizSchema.safeParse(input)
  if (!id.success) return fail(ERR.invalid)
  if (!parsed.success) return fail(fieldError(parsed.error))
  const ctx = await lessonContext(id.data)
  if (!ctx) return fail(ERR.notFound)
  for (const q of parsed.data.questions) {
    const correct = q.choices.filter((c) => c.isCorrect).length
    if (correct === 0) return fail(`「${q.question.slice(0, 20)}」に正解を設定してください。`)
    if (!q.isMultiple && correct > 1) return fail(`「${q.question.slice(0, 20)}」は単一選択です。正解は 1 つにしてください。`)
  }

  const quizId = await db.transaction(async (tx) => {
    const [quiz] = await tx
      .insert(quizzes)
      .values({ lessonId: ctx.lesson.id, passPercent: parsed.data.passPercent })
      .onConflictDoUpdate({ target: quizzes.lessonId, set: { passPercent: parsed.data.passPercent } })
      .returning({ id: quizzes.id })
    if (!quiz) throw new Error('quiz upsert failed')
    const existingQ = await tx.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id))
    const existingQIds = new Set(existingQ.map((q) => q.id))
    const keepQ = new Set<string>()
    for (const [qi, q] of parsed.data.questions.entries()) {
      let qid: string
      if (q.id && existingQIds.has(q.id)) {
        qid = q.id
        await tx
          .update(quizQuestions)
          .set({ question: q.question, explanation: q.explanation || null, isMultiple: q.isMultiple, sortOrder: qi + 1 })
          .where(eq(quizQuestions.id, qid))
      } else {
        const [ins] = await tx
          .insert(quizQuestions)
          .values({ quizId: quiz.id, question: q.question, explanation: q.explanation || null, isMultiple: q.isMultiple, sortOrder: qi + 1 })
          .returning({ id: quizQuestions.id })
        if (!ins) throw new Error('question insert failed')
        qid = ins.id
      }
      keepQ.add(qid)
      const existingC = await tx.select({ id: quizChoices.id }).from(quizChoices).where(eq(quizChoices.questionId, qid))
      const existingCIds = new Set(existingC.map((c) => c.id))
      const keepC = new Set<string>()
      for (const [ci, c] of q.choices.entries()) {
        if (c.id && existingCIds.has(c.id)) {
          await tx.update(quizChoices).set({ label: c.label, isCorrect: c.isCorrect, sortOrder: ci + 1 }).where(eq(quizChoices.id, c.id))
          keepC.add(c.id)
        } else {
          const [ins] = await tx.insert(quizChoices).values({ questionId: qid, label: c.label, isCorrect: c.isCorrect, sortOrder: ci + 1 }).returning({ id: quizChoices.id })
          if (ins) keepC.add(ins.id)
        }
      }
      for (const c of existingC) if (!keepC.has(c.id)) await tx.delete(quizChoices).where(eq(quizChoices.id, c.id))
    }
    for (const q of existingQ) if (!keepQ.has(q.id)) await tx.delete(quizQuestions).where(eq(quizQuestions.id, q.id))
    return quiz.id
  })
  revalidatePath(`/admin/courses/${ctx.course.id}/lessons/${ctx.lesson.id}`)
  revalidatePath(`/courses/${ctx.course.slug}/lessons/${ctx.lesson.id}`)
  return ok({ quizId })
}
