import 'server-only'
import { and, count, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  badges,
  categories,
  certificates,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  officeHourAttendance,
  posts,
  profiles,
  qaThreads,
  sections,
  userBadges,
  xpEvents,
  xpRules,
} from '@/lib/db/schema'
import { calcXpAward, evaluateBadges, generateVerifyCode, isCourseComplete, type BadgeStats } from '@/lib/xp'
import { createNotification, sendEmailIfEnabled } from '@/lib/notify'
import { CertificateIssuedEmail } from '@/emails/templates'

/**
 * XP 付与（service role 相当の db クライアントで実行。§7.1: xp_events の書き込みはサーバーのみ）
 * 同一 ref に対する二重付与は防ぐ。
 */
export async function awardXp(userId: string, action: string, ref?: { type: string; id: string }): Promise<number> {
  if (ref) {
    const dup = await db.query.xpEvents.findFirst({
      where: and(eq(xpEvents.userId, userId), eq(xpEvents.action, action), eq(xpEvents.refType, ref.type), eq(xpEvents.refId, ref.id)),
    })
    if (dup) return 0
  }
  const rules = await db.select().from(xpRules)
  const rule = rules.find((r) => r.action === action)
  if (!rule) return 0
  let todayEarned = 0
  if (rule.dailyCap != null) {
    const [row] = await db
      .select({ sum: sql<number>`coalesce(sum(${xpEvents.xp}), 0)` })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.userId, userId),
          eq(xpEvents.action, action),
          gte(xpEvents.createdAt, sql`(now() at time zone 'Asia/Tokyo')::date at time zone 'Asia/Tokyo'`),
        ),
      )
    todayEarned = Number(row?.sum ?? 0)
  }
  const xp = calcXpAward(rules, action, todayEarned)
  if (xp <= 0) return 0
  // profiles.total_xp は DB トリガー（xp_event_sum）で同期される
  await db.insert(xpEvents).values({ userId, action, xp, refType: ref?.type ?? null, refId: ref?.id ?? null })
  return xp
}

export async function collectBadgeStats(userId: string): Promise<BadgeStats> {
  const [lessonsDone] = await db
    .select({ n: count() })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, 'completed')))
  const completedCourses = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), isNotNull(enrollments.completedAt)))
  const [qa] = await db.select({ n: count() }).from(qaThreads).where(eq(qaThreads.userId, userId))
  const [postN] = await db.select({ n: count() }).from(posts).where(eq(posts.userId, userId))
  const [oh] = await db.select({ n: count() }).from(officeHourAttendance).where(eq(officeHourAttendance.userId, userId))
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })

  const published = await db
    .select({ courseId: courses.id, categorySlug: categories.slug })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .where(eq(courses.status, 'published'))
  const completedSet = new Set(completedCourses.map((c) => c.courseId))
  const cats: BadgeStats['categories'] = {}
  for (const c of published) {
    if (!c.categorySlug) continue
    const entry = (cats[c.categorySlug] ??= { total: 0, completed: 0 })
    entry.total++
    if (completedSet.has(c.courseId)) entry.completed++
  }
  return {
    lessonsCompleted: lessonsDone?.n ?? 0,
    coursesCompleted: completedCourses.length,
    qaQuestions: qa?.n ?? 0,
    communityPosts: postN?.n ?? 0,
    officeHoursAttended: oh?.n ?? 0,
    streakDays: profile?.streakDays ?? 0,
    totalXp: profile?.totalXp ?? 0,
    categories: cats,
  }
}

/** バッジ判定 → 新規獲得分を付与し通知する */
export async function checkBadges(userId: string): Promise<string[]> {
  const all = await db.select().from(badges)
  const earned = await db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId))
  const stats = await collectBadgeStats(userId)
  const newly = evaluateBadges(all, earned.map((e) => e.badgeId), stats)
  for (const b of newly) {
    await db.insert(userBadges).values({ userId, badgeId: b.id }).onConflictDoNothing()
    await createNotification({ userId, type: 'badge', title: `バッジ「${b.name}」を獲得しました`, body: b.description, link: '/badges' })
  }
  return newly.map((b) => b.name)
}

/** レッスン完了時の後続処理: XP → コース完了判定 → 修了証 → バッジ */
export async function onLessonCompleted(userId: string, lessonId: string) {
  await awardXp(userId, 'lesson_complete', { type: 'lesson', id: lessonId })

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { courseCompleted: false }
  const section = await db.query.sections.findFirst({ where: eq(sections.id, lesson.sectionId) })
  if (!section) return { courseCompleted: false }

  const courseLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.courseId, section.courseId))
  const ids = courseLessons.map((l) => l.id)
  const [done] = ids.length
    ? await db
        .select({ n: count() })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, 'completed'), inArray(lessonProgress.lessonId, ids)))
    : [{ n: 0 }]

  let courseCompleted = false
  if (isCourseComplete(ids.length, done?.n ?? 0)) {
    const enrollment = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, section.courseId)),
    })
    if (!enrollment) {
      await db.insert(enrollments).values({ userId, courseId: section.courseId, completedAt: new Date() }).onConflictDoNothing()
      courseCompleted = true
    } else if (!enrollment.completedAt) {
      await db
        .update(enrollments)
        .set({ completedAt: new Date() })
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, section.courseId)))
      courseCompleted = true
    }
    if (courseCompleted) await onCourseCompleted(userId, section.courseId)
  }
  await checkBadges(userId)
  return { courseCompleted }
}

export async function onCourseCompleted(userId: string, courseId: string) {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) return
  await awardXp(userId, 'course_complete', { type: 'course', id: courseId })
  const cert = await issueCertificate(userId, courseId)
  await createNotification({
    userId,
    type: 'course_complete',
    title: `「${course.title}」を修了しました`,
    body: '修了証を発行しました。',
    link: '/certificates',
  })
  if (cert) {
    await sendEmailIfEnabled(
      userId,
      null,
      `「${course.title}」の修了証を発行しました`,
      CertificateIssuedEmail({ courseTitle: course.title, verifyCode: cert.verifyCode }),
    )
  }
}

/** 修了証発行（PDF は初回アクセス時に生成し Storage にキャッシュ） */
export async function issueCertificate(userId: string, courseId: string) {
  const existing = await db.query.certificates.findFirst({
    where: and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)),
  })
  if (existing) return existing
  for (let i = 0; i < 5; i++) {
    const verifyCode = generateVerifyCode(new Date().getFullYear())
    const clash = await db.query.certificates.findFirst({ where: eq(certificates.verifyCode, verifyCode) })
    if (clash) continue
    const [row] = await db.insert(certificates).values({ userId, courseId, verifyCode }).onConflictDoNothing().returning()
    if (row) return row
  }
  return null
}
