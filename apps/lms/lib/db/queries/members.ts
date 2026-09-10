import 'server-only'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  badges,
  certificates,
  courses,
  enrollments,
  invitations,
  lessonProgress,
  lessons,
  profiles,
  sections,
  userBadges,
  type Profile,
  type UserRole,
} from '@/lib/db/schema'
import { calcCourseProgress } from '@/lib/xp'

export type MemberRow = {
  id: string
  displayName: string
  email: string | null
  role: UserRole
  totalXp: number
  lastLoginAt: Date | null
  deletionRequestedAt: Date | null
  createdAt: Date
}

export type MemberListOptions = {
  q?: string | null
  role?: UserRole | null
  pendingOnly?: boolean
  page?: number
  perPage?: number
}

/**
 * ADM-04: 会員一覧（メールは auth.users を join。admin 画面専用 — クライアントに漏らさない）
 */
export async function listMembers(opts: MemberListOptions = {}): Promise<{ rows: MemberRow[]; total: number; page: number; perPage: number }> {
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 30))
  const page = Math.max(1, opts.page ?? 1)
  const q = (opts.q ?? '').trim()
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`

  const where = sql`p.deleted_at is null`
  const conds = [where]
  if (q) conds.push(sql`(p.display_name ilike ${like} or u.email ilike ${like})`)
  if (opts.role) conds.push(sql`p.role = ${opts.role}`)
  if (opts.pendingOnly) conds.push(sql`p.deletion_requested_at is not null`)
  const whereSql = sql.join(conds, sql` and `)

  const rows = await db.execute<{
    id: string
    display_name: string
    email: string | null
    role: UserRole
    total_xp: number
    last_login_at: string | null
    deletion_requested_at: string | null
    created_at: string
  }>(sql`
    select p.id, p.display_name, u.email, p.role, p.total_xp, p.last_login_at, p.deletion_requested_at, p.created_at
    from profiles p
    left join auth.users u on u.id = p.id
    where ${whereSql}
    order by p.created_at desc
    limit ${perPage} offset ${(page - 1) * perPage}
  `)
  const [cnt] = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from profiles p left join auth.users u on u.id = p.id where ${whereSql}
  `)
  return {
    rows: rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      email: r.email,
      role: r.role,
      totalXp: Number(r.total_xp),
      lastLoginAt: r.last_login_at ? new Date(r.last_login_at) : null,
      deletionRequestedAt: r.deletion_requested_at ? new Date(r.deletion_requested_at) : null,
      createdAt: new Date(r.created_at),
    })),
    total: Number(cnt?.n ?? 0),
    page,
    perPage,
  }
}

export async function getMemberEmail(userId: string): Promise<string | null> {
  const [r] = await db.execute<{ email: string | null }>(sql`select email from auth.users where id = ${userId}::uuid`)
  return r?.email ?? null
}

/** 登録済みメール（小文字）を一括で引く */
export async function findExistingEmails(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()
  const rows = await db.execute<{ email: string }>(sql`select lower(email) as email from auth.users where lower(email) = any(${emails.map((e) => e.toLowerCase())}::text[])`)
  return new Set(rows.map((r) => r.email))
}

export type InvitationStatus = 'pending' | 'expired' | 'used'

export async function listInvitations() {
  const rows = await db
    .select({ inv: invitations, inviterName: profiles.displayName })
    .from(invitations)
    .leftJoin(profiles, eq(profiles.id, invitations.invitedBy))
    .orderBy(desc(invitations.createdAt))
    .limit(200)
  const now = Date.now()
  return rows.map((r) => {
    const status: InvitationStatus = r.inv.usedAt ? 'used' : r.inv.expiresAt.getTime() < now ? 'expired' : 'pending'
    return { ...r.inv, inviterName: r.inviterName, status }
  })
}

export type MemberCourseProgress = {
  courseId: string
  slug: string
  title: string
  status: 'draft' | 'published' | 'archived'
  lessonCount: number
  completedCount: number
  progress: number
  enrolledAt: Date | null
  completedAt: Date | null
}

/** 会員ごとの受講状況（受講登録があるコース + 進捗があるコース） */
export async function getMemberCourseProgress(userId: string): Promise<MemberCourseProgress[]> {
  const rows = await db
    .select({
      courseId: courses.id,
      slug: courses.slug,
      title: courses.title,
      status: courses.status,
      lessonCount: sql<number>`(select count(*) from ${lessons} l join ${sections} s on s.id = l.section_id where s.course_id = "courses"."id")`,
      completedCount: sql<number>`(select count(*) from ${lessonProgress} lp join ${lessons} l on l.id = lp.lesson_id join ${sections} s on s.id = l.section_id where s.course_id = "courses"."id" and lp.user_id = ${userId} and lp.status = 'completed')`,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
    })
    .from(courses)
    .leftJoin(enrollments, and(eq(enrollments.courseId, courses.id), eq(enrollments.userId, userId)))
    .where(sql`${courses.status} <> 'archived'`)
    .orderBy(asc(courses.sortOrder), desc(courses.createdAt))
  return rows.map((r) => {
    const lessonCount = Number(r.lessonCount)
    const completedCount = Number(r.completedCount)
    return { ...r, lessonCount, completedCount, progress: calcCourseProgress(lessonCount, completedCount) }
  })
}

export type MemberDetail = {
  profile: Profile
  email: string | null
  badges: { id: string; name: string; icon: string | null; earnedAt: Date }[]
  certificates: { id: string; courseTitle: string; verifyCode: string; issuedAt: Date }[]
  courses: MemberCourseProgress[]
}

export async function getMemberDetail(userId: string): Promise<MemberDetail | null> {
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  if (!profile) return null
  const [email, b, c, cs] = await Promise.all([
    getMemberEmail(userId),
    db
      .select({ id: badges.id, name: badges.name, icon: badges.icon, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt)),
    db
      .select({ id: certificates.id, courseTitle: courses.title, verifyCode: certificates.verifyCode, issuedAt: certificates.issuedAt })
      .from(certificates)
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.userId, userId))
      .orderBy(desc(certificates.issuedAt)),
    getMemberCourseProgress(userId),
  ])
  return { profile, email, badges: b, certificates: c, courses: cs }
}

// ---------- ADM-05 受講状況 ----------

export type ProgressMatrix = {
  courses: { id: string; title: string; lessonCount: number }[]
  members: {
    id: string
    displayName: string
    email: string | null
    lastLoginAt: Date | null
    progress: Record<string, { completed: number; progress: number; completedAt: Date | null }>
  }[]
}

export async function getProgressMatrix(opts: { includeEmail?: boolean } = {}): Promise<ProgressMatrix> {
  const cs = await db
    .select({
      id: courses.id,
      title: courses.title,
      lessonCount: sql<number>`(select count(*) from ${lessons} l join ${sections} s on s.id = l.section_id where s.course_id = "courses"."id")`,
    })
    .from(courses)
    .where(eq(courses.status, 'published'))
    .orderBy(asc(courses.sortOrder), desc(courses.createdAt))
  const courseIds = cs.map((c) => c.id)

  const members = await db
    .select({ id: profiles.id, displayName: profiles.displayName, lastLoginAt: profiles.lastLoginAt })
    .from(profiles)
    .where(isNull(profiles.deletedAt))
    .orderBy(asc(profiles.displayName))

  const emails = new Map<string, string | null>()
  if (opts.includeEmail && members.length) {
    const rows = await db.execute<{ id: string; email: string | null }>(sql`select id, email from auth.users`)
    for (const r of rows) emails.set(r.id, r.email)
  }

  const completed = courseIds.length
    ? await db
        .select({ userId: lessonProgress.userId, courseId: sections.courseId, n: sql<number>`count(*)` })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .innerJoin(sections, eq(sections.id, lessons.sectionId))
        .where(and(eq(lessonProgress.status, 'completed'), inArray(sections.courseId, courseIds)))
        .groupBy(lessonProgress.userId, sections.courseId)
    : []
  const enr = courseIds.length
    ? await db
        .select({ userId: enrollments.userId, courseId: enrollments.courseId, completedAt: enrollments.completedAt })
        .from(enrollments)
        .where(inArray(enrollments.courseId, courseIds))
    : []

  const result: ProgressMatrix['members'] = members.map((m) => {
    const progress: ProgressMatrix['members'][number]['progress'] = {}
    for (const c of cs) {
      const done = Number(completed.find((x) => x.userId === m.id && x.courseId === c.id)?.n ?? 0)
      const e = enr.find((x) => x.userId === m.id && x.courseId === c.id)
      progress[c.id] = { completed: done, progress: calcCourseProgress(Number(c.lessonCount), done), completedAt: e?.completedAt ?? null }
    }
    return { id: m.id, displayName: m.displayName, email: emails.get(m.id) ?? null, lastLoginAt: m.lastLoginAt, progress }
  })
  return { courses: cs.map((c) => ({ ...c, lessonCount: Number(c.lessonCount) })), members: result }
}
