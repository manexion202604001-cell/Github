import 'server-only'
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  announcements,
  auditLogs,
  badges,
  categories,
  courses,
  enrollments,
  lessonAttachments,
  lessons,
  profiles,
  quizChoices,
  quizQuestions,
  quizzes,
  sections,
  xpRules,
  type Lesson,
  type Section,
} from '@/lib/db/schema'
import { DEFAULT_XP_RULES, XP_ACTIONS, type XpRule } from '@/lib/xp'

// ---------- ADM-11 ダッシュボード ----------

export type AdminStats = {
  members: number
  wau: number
  wauRate: number
  enrollments: number
  completedEnrollments: number
  completionRate: number
  unansweredQuestions: number
  newPostsThisWeek: number
  pendingDeletions: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [members] = await db.select({ n: count() }).from(profiles).where(isNull(profiles.deletedAt))
  const [wau] = await db.execute<{ n: number }>(sql`
    select count(distinct p.id)::int as n
    from profiles p
    where p.deleted_at is null and (
      exists (select 1 from lesson_progress lp where lp.user_id = p.id and lp.updated_at >= ${since})
      or exists (select 1 from posts po where po.user_id = p.id and po.created_at >= ${since})
      or exists (select 1 from qa_threads q where q.user_id = p.id and q.created_at >= ${since})
      or exists (select 1 from office_hour_attendance oa where oa.user_id = p.id and oa.joined_at >= ${since})
    )
  `)
  const [enr] = await db.select({ n: count() }).from(enrollments)
  const [done] = await db.select({ n: count() }).from(enrollments).where(isNotNull(enrollments.completedAt))
  const [unanswered] = await db.execute<{ n: number }>(sql`select count(*)::int as n from qa_threads where status = 'open'`)
  const [posts] = await db.execute<{ n: number }>(sql`select count(*)::int as n from posts where created_at >= ${since} and is_hidden = false`)
  const [pending] = await db
    .select({ n: count() })
    .from(profiles)
    .where(and(isNull(profiles.deletedAt), isNotNull(profiles.deletionRequestedAt)))

  const m = members?.n ?? 0
  const w = Number(wau?.n ?? 0)
  const e = enr?.n ?? 0
  const d = done?.n ?? 0
  return {
    members: m,
    wau: w,
    wauRate: m === 0 ? 0 : Math.round((w / m) * 100),
    enrollments: e,
    completedEnrollments: d,
    completionRate: e === 0 ? 0 : Math.round((d / e) * 100),
    unansweredQuestions: Number(unanswered?.n ?? 0),
    newPostsThisWeek: Number(posts?.n ?? 0),
    pendingDeletions: pending?.n ?? 0,
  }
}

// ---------- ADM-01 コース ----------

export async function listAdminCourses() {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      status: courses.status,
      level: courses.level,
      sortOrder: courses.sortOrder,
      publishedAt: courses.publishedAt,
      updatedAt: courses.updatedAt,
      categoryName: categories.name,
      lessonCount: sql<number>`(select count(*) from ${lessons} l join ${sections} s on s.id = l.section_id where s.course_id = ${courses.id})`,
    })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .orderBy(asc(courses.sortOrder), desc(courses.createdAt))
}

export type AdminCourseDetail = {
  course: typeof courses.$inferSelect
  sections: (Section & { lessons: Lesson[] })[]
}

export async function getAdminCourse(id: string): Promise<AdminCourseDetail | null> {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id) })
  if (!course) return null
  const secs = await db.select().from(sections).where(eq(sections.courseId, id)).orderBy(asc(sections.sortOrder))
  const secIds = secs.map((s) => s.id)
  const lsns = secIds.length
    ? await db.select().from(lessons).where(inArray(lessons.sectionId, secIds)).orderBy(asc(lessons.sortOrder), asc(lessons.createdAt))
    : []
  return { course, sections: secs.map((s) => ({ ...s, lessons: lsns.filter((l) => l.sectionId === s.id) })) }
}

export type AdminLessonDetail = {
  lesson: Lesson
  section: Section
  course: { id: string; slug: string; title: string }
  attachments: { id: string; fileName: string; storagePath: string; sizeBytes: number | null }[]
  quiz: {
    id: string
    passPercent: number
    questions: { id: string; question: string; explanation: string | null; isMultiple: boolean; choices: { id: string; label: string; isCorrect: boolean }[] }[]
  } | null
}

export async function getAdminLesson(lessonId: string): Promise<AdminLessonDetail | null> {
  const row = await db
    .select({ lesson: lessons, section: sections, course: { id: courses.id, slug: courses.slug, title: courses.title } })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessons.id, lessonId))
    .then((r) => r[0])
  if (!row) return null
  const atts = await db
    .select({ id: lessonAttachments.id, fileName: lessonAttachments.fileName, storagePath: lessonAttachments.storagePath, sizeBytes: lessonAttachments.sizeBytes })
    .from(lessonAttachments)
    .where(eq(lessonAttachments.lessonId, lessonId))
  let quiz: AdminLessonDetail['quiz'] = null
  const q = await db.query.quizzes.findFirst({ where: eq(quizzes.lessonId, lessonId) })
  if (q) {
    const qs = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, q.id)).orderBy(asc(quizQuestions.sortOrder))
    const qIds = qs.map((x) => x.id)
    const cs = qIds.length ? await db.select().from(quizChoices).where(inArray(quizChoices.questionId, qIds)).orderBy(asc(quizChoices.sortOrder)) : []
    quiz = {
      id: q.id,
      passPercent: q.passPercent,
      questions: qs.map((x) => ({
        id: x.id,
        question: x.question,
        explanation: x.explanation,
        isMultiple: x.isMultiple,
        choices: cs.filter((c) => c.questionId === x.id).map((c) => ({ id: c.id, label: c.label, isCorrect: c.isCorrect })),
      })),
    }
  }
  return { lesson: row.lesson, section: row.section, course: row.course, attachments: atts, quiz }
}

export async function listAdminCategories() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      sortOrder: categories.sortOrder,
      courseCount: sql<number>`(select count(*) from ${courses} c where c.category_id = ${categories.id})`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name))
}

// ---------- ADM-09 バッジ・XP ----------

export async function listXpRules(): Promise<XpRule[]> {
  const rows = await db.select().from(xpRules)
  return XP_ACTIONS.map((a) => {
    const r = rows.find((x) => x.action === a)
    const d = DEFAULT_XP_RULES.find((x) => x.action === a)
    return { action: a, xp: r?.xp ?? d?.xp ?? 0, dailyCap: r ? r.dailyCap : (d?.dailyCap ?? null) }
  })
}

export async function listBadges() {
  return db.select().from(badges).orderBy(asc(badges.sortOrder), asc(badges.name))
}

// ---------- ADM-10 お知らせ ----------

export async function listAnnouncements() {
  return db
    .select({ a: announcements, authorName: profiles.displayName })
    .from(announcements)
    .leftJoin(profiles, eq(profiles.id, announcements.createdBy))
    .orderBy(desc(announcements.createdAt))
    .then((rows) => rows.map((r) => ({ ...r.a, authorName: r.authorName })))
}

export async function getAnnouncement(id: string) {
  return db.query.announcements.findFirst({ where: eq(announcements.id, id) })
}

// ---------- 監査ログ ----------

export async function listAuditLogs(limit = 100) {
  return db
    .select({ log: auditLogs, actorName: profiles.displayName })
    .from(auditLogs)
    .leftJoin(profiles, eq(profiles.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .then((rows) => rows.map((r) => ({ ...r.log, actorName: r.actorName })))
}

export async function countRecentAudit(days = 7) {
  const [r] = await db
    .select({ n: count() })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, new Date(Date.now() - days * 86_400_000)))
  return r?.n ?? 0
}
