import 'server-only'
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  categories,
  courses,
  enrollments,
  lessonAttachments,
  lessonNotes,
  lessonProgress,
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
import { calcCourseProgress } from '@/lib/xp'

/** コース内レッスンの表示順 ID 配列 */
export async function getCourseLessonOrder(courseId: string): Promise<string[]> {
  const rows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.sortOrder), asc(lessons.sortOrder), asc(lessons.createdAt))
  return rows.map((r) => r.id)
}

export async function getCompletedLessonIds(userId: string, courseId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: lessonProgress.lessonId })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(and(eq(sections.courseId, courseId), eq(lessonProgress.userId, userId), eq(lessonProgress.status, 'completed')))
  return new Set(rows.map((r) => r.id))
}

export type CourseCard = Course & {
  categoryName: string | null
  categorySlug: string | null
  lessonCount: number
  completedCount: number
  progress: number
  enrolled: boolean
  completedAt: Date | null
  state: 'not_started' | 'in_progress' | 'completed'
}

/** LEARN-01: コース一覧（進捗付き） */
export async function listCoursesWithProgress(
  userId: string,
  opts: { includeDrafts?: boolean; category?: string | null; level?: string | null; state?: string | null; sort?: string | null } = {},
): Promise<CourseCard[]> {
  const rows = await db
    .select({
      course: courses,
      categoryName: categories.name,
      categorySlug: categories.slug,
      lessonCount: sql<number>`(select count(*) from ${lessons} l join ${sections} s on s.id = l.section_id where s.course_id = "courses"."id")`,
      completedCount: sql<number>`(select count(*) from ${lessonProgress} lp join ${lessons} l on l.id = lp.lesson_id join ${sections} s on s.id = l.section_id where s.course_id = "courses"."id" and lp.user_id = ${userId} and lp.status = 'completed')`,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
    })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .leftJoin(enrollments, and(eq(enrollments.courseId, courses.id), eq(enrollments.userId, userId)))
    .where(opts.includeDrafts ? sql`${courses.status} <> 'archived'` : eq(courses.status, 'published'))
    .orderBy(asc(courses.sortOrder), desc(courses.publishedAt), desc(courses.createdAt))

  let cards: CourseCard[] = rows.map((r) => {
    const lessonCount = Number(r.lessonCount)
    const completedCount = Number(r.completedCount)
    const progress = calcCourseProgress(lessonCount, completedCount)
    const state: CourseCard['state'] = r.completedAt ? 'completed' : r.enrolledAt || completedCount > 0 ? 'in_progress' : 'not_started'
    return {
      ...r.course,
      categoryName: r.categoryName,
      categorySlug: r.categorySlug,
      lessonCount,
      completedCount,
      progress,
      enrolled: !!r.enrolledAt,
      completedAt: r.completedAt,
      state,
    }
  })
  if (opts.category) cards = cards.filter((c) => c.categorySlug === opts.category)
  if (opts.level) cards = cards.filter((c) => c.level === opts.level)
  if (opts.state) cards = cards.filter((c) => c.state === opts.state)
  if (opts.sort === 'state') {
    const rank = { in_progress: 0, not_started: 1, completed: 2 } as const
    cards.sort((a, b) => rank[a.state] - rank[b.state])
  }
  return cards
}

export type CourseOutline = {
  course: Course & { categoryName: string | null; categorySlug: string | null }
  instructor: { id: string; displayName: string; avatarUrl: string | null; bio: string | null } | null
  sections: (Section & { lessons: Lesson[] })[]
  lessonOrder: string[]
  completed: Set<string>
  progress: number
  enrollment: { enrolledAt: Date; completedAt: Date | null } | null
  lastPositions: Map<string, number>
}

/** LEARN-02: コース詳細（目次 + 進捗） */
export async function getCourseOutline(slug: string, userId: string, allowDraft = false): Promise<CourseOutline | null> {
  const row = await db
    .select({ course: courses, categoryName: categories.name, categorySlug: categories.slug })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .where(eq(courses.slug, slug))
    .then((r) => r[0])
  if (!row) return null
  if (row.course.status !== 'published' && !allowDraft) return null
  const course = row.course

  const secs = await db.select().from(sections).where(eq(sections.courseId, course.id)).orderBy(asc(sections.sortOrder))
  const secIds = secs.map((s) => s.id)
  const lsns = secIds.length
    ? await db.select().from(lessons).where(inArray(lessons.sectionId, secIds)).orderBy(asc(lessons.sortOrder), asc(lessons.createdAt))
    : []
  const outline = secs.map((s) => ({ ...s, lessons: lsns.filter((l) => l.sectionId === s.id) }))
  const lessonOrder = outline.flatMap((s) => s.lessons.map((l) => l.id))

  const prog = lessonOrder.length
    ? await db
        .select({ lessonId: lessonProgress.lessonId, status: lessonProgress.status, pos: lessonProgress.lastPositionSec })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.lessonId, lessonOrder)))
    : []
  const completed = new Set(prog.filter((p) => p.status === 'completed').map((p) => p.lessonId))
  const lastPositions = new Map(prog.map((p) => [p.lessonId, p.pos ?? 0]))
  const enrollment = await db.query.enrollments.findFirst({ where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id)) })
  const instructor = course.createdBy
    ? await db.query.profiles.findFirst({
        where: eq(profiles.id, course.createdBy),
        columns: { id: true, displayName: true, avatarUrl: true, bio: true },
      })
    : null

  return {
    course: { ...course, categoryName: row.categoryName, categorySlug: row.categorySlug },
    instructor: instructor ?? null,
    sections: outline,
    lessonOrder,
    completed,
    progress: calcCourseProgress(lessonOrder.length, completed.size),
    enrollment: enrollment ? { enrolledAt: enrollment.enrolledAt, completedAt: enrollment.completedAt } : null,
    lastPositions,
  }
}

export type LessonView = {
  lesson: Lesson
  attachments: { id: string; fileName: string; sizeBytes: number | null }[]
  note: string
  quiz: { id: string; passPercent: number; questions: { id: string; question: string; isMultiple: boolean; choices: { id: string; label: string }[] }[] } | null
  lastPositionSec: number
  completed: boolean
}

export async function getLessonView(lessonId: string, userId: string): Promise<LessonView | null> {
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return null
  const atts = await db
    .select({ id: lessonAttachments.id, fileName: lessonAttachments.fileName, sizeBytes: lessonAttachments.sizeBytes })
    .from(lessonAttachments)
    .where(eq(lessonAttachments.lessonId, lessonId))
  const note = await db.query.lessonNotes.findFirst({ where: and(eq(lessonNotes.userId, userId), eq(lessonNotes.lessonId, lessonId)) })
  const progress = await db.query.lessonProgress.findFirst({
    where: and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
  })
  let quiz: LessonView['quiz'] = null
  if (lesson.type === 'quiz') {
    const q = await db.query.quizzes.findFirst({ where: eq(quizzes.lessonId, lessonId) })
    if (q) {
      const qs = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, q.id)).orderBy(asc(quizQuestions.sortOrder))
      const qIds = qs.map((x) => x.id)
      const cs = qIds.length
        ? await db
            .select({ id: quizChoices.id, questionId: quizChoices.questionId, label: quizChoices.label })
            .from(quizChoices)
            .where(inArray(quizChoices.questionId, qIds))
            .orderBy(asc(quizChoices.sortOrder))
        : []
      quiz = {
        id: q.id,
        passPercent: q.passPercent,
        questions: qs.map((x) => ({
          id: x.id,
          question: x.question,
          isMultiple: x.isMultiple,
          choices: cs.filter((c) => c.questionId === x.id).map((c) => ({ id: c.id, label: c.label })),
        })),
      }
    }
  }
  return {
    lesson,
    attachments: atts,
    note: note?.bodyMd ?? '',
    quiz,
    lastPositionSec: progress?.lastPositionSec ?? 0,
    completed: progress?.status === 'completed',
  }
}

/** LEARN-12: 最後に見たレッスン */
export async function getLastViewedLesson(userId: string) {
  const row = await db
    .select({
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      lessonType: lessons.type,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      courseId: courses.id,
      status: lessonProgress.status,
      updatedAt: lessonProgress.updatedAt,
    })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(and(eq(lessonProgress.userId, userId), eq(courses.status, 'published')))
    .orderBy(desc(lessonProgress.updatedAt))
    .limit(1)
    .then((r) => r[0])
  if (!row) return null
  // 完了済みなら次の未完了レッスンを案内
  if (row.status === 'completed') {
    const order = await getCourseLessonOrder(row.courseId)
    const done = await getCompletedLessonIds(userId, row.courseId)
    const idx = order.indexOf(row.lessonId)
    const next = order.slice(idx + 1).find((id) => !done.has(id)) ?? order.find((id) => !done.has(id))
    if (next) {
      const nl = await db.query.lessons.findFirst({ where: eq(lessons.id, next) })
      if (nl) return { ...row, lessonId: nl.id, lessonTitle: nl.title, lessonType: nl.type, status: 'not_started' as const }
    }
  }
  return row
}

export async function getNewCourses(limit = 4) {
  return db
    .select({ id: courses.id, slug: courses.slug, title: courses.title, level: courses.level, publishedAt: courses.publishedAt, categoryName: categories.name })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .where(eq(courses.status, 'published'))
    .orderBy(desc(courses.publishedAt), desc(courses.createdAt))
    .limit(limit)
}

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))
}

export async function countCompletedCourses(userId: string) {
  const [r] = await db.select({ n: count() }).from(enrollments).where(and(eq(enrollments.userId, userId), isNotNull(enrollments.completedAt)))
  return r?.n ?? 0
}
