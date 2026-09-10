import 'server-only'
import { and, asc, count, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { officeHourAttendance, officeHourQuestionVotes, officeHourQuestions, officeHours, profiles, type OfficeHour } from '@/lib/db/schema'
import { isOfficeHourEnded } from '@/lib/office-hours'

/** OH-01: 次回（scheduled_at >= now で最も近いもの） */
export async function getNextOfficeHour(now: Date = new Date()): Promise<OfficeHour | null> {
  const row = await db.query.officeHours.findFirst({
    where: gte(officeHours.scheduledAt, now),
    orderBy: [asc(officeHours.scheduledAt)],
  })
  return row ?? null
}

/** OH-01: 今後の予定（次回を含む、日時順） */
export async function listUpcomingOfficeHours(now: Date = new Date()): Promise<OfficeHour[]> {
  return db.select().from(officeHours).where(gte(officeHours.scheduledAt, now)).orderBy(asc(officeHours.scheduledAt))
}

/** OH-04: 過去回一覧（録画あり）。新しい順 */
export async function listPastOfficeHours(now: Date = new Date()): Promise<OfficeHour[]> {
  return db
    .select()
    .from(officeHours)
    .where(and(lt(officeHours.scheduledAt, now), isNotNull(officeHours.recordingUrl)))
    .orderBy(desc(officeHours.scheduledAt))
}

/** 管理画面向け：全件（新しい順）+ 質問数・参加者数 */
export async function listAllOfficeHoursForAdmin(): Promise<(OfficeHour & { questionCount: number; attendeeCount: number })[]> {
  const rows = await db
    .select({
      oh: officeHours,
      questionCount: sql<number>`(select count(*) from ${officeHourQuestions} q where q.office_hour_id = "office_hours"."id")`,
      attendeeCount: sql<number>`(select count(*) from ${officeHourAttendance} a where a.office_hour_id = "office_hours"."id")`,
    })
    .from(officeHours)
    .orderBy(desc(officeHours.scheduledAt))
  return rows.map((r) => ({ ...r.oh, questionCount: Number(r.questionCount), attendeeCount: Number(r.attendeeCount) }))
}

export type OfficeHourQuestionItem = {
  id: string
  body: string
  createdAt: Date
  userId: string
  displayName: string
  avatarUrl: string | null
  voteCount: number
  votedByMe: boolean
}

export type OfficeHourDetail = {
  officeHour: OfficeHour
  questions: OfficeHourQuestionItem[]
  attended: boolean
  /** staff 向け（それ以外は null） */
  attendeeCount: number | null
  isPast: boolean
}

/** OH-02/04/05: 詳細（事前質問は投票数順、自分の投票、参加済みか、参加者数） */
export async function getOfficeHourDetail(id: string, userId: string, staff: boolean, now: Date = new Date()): Promise<OfficeHourDetail | null> {
  const officeHour = await db.query.officeHours.findFirst({ where: eq(officeHours.id, id) })
  if (!officeHour) return null
  const [questions, attendance, attendeeCount] = await Promise.all([
    listOfficeHourQuestions(id, userId),
    db.query.officeHourAttendance.findFirst({
      where: and(eq(officeHourAttendance.officeHourId, id), eq(officeHourAttendance.userId, userId)),
    }),
    staff ? countAttendees(id) : Promise.resolve(null),
  ])
  return { officeHour, questions, attended: !!attendance, attendeeCount, isPast: isOfficeHourEnded(officeHour.scheduledAt, officeHour.durationMin, now) }
}

/** OH-02: 事前質問を投票数順（同数なら古い順）で取得 */
export async function listOfficeHourQuestions(officeHourId: string, userId: string): Promise<OfficeHourQuestionItem[]> {
  const rows = await db
    .select({
      id: officeHourQuestions.id,
      body: officeHourQuestions.body,
      createdAt: officeHourQuestions.createdAt,
      userId: officeHourQuestions.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      deletedAt: profiles.deletedAt,
      voteCount: sql<number>`(select count(*) from ${officeHourQuestionVotes} v where v.question_id = "office_hour_questions"."id")`,
      votedByMe: sql<boolean>`exists(select 1 from ${officeHourQuestionVotes} v where v.question_id = "office_hour_questions"."id" and v.user_id = ${userId})`,
    })
    .from(officeHourQuestions)
    .innerJoin(profiles, eq(profiles.id, officeHourQuestions.userId))
    .where(eq(officeHourQuestions.officeHourId, officeHourId))
    .orderBy(desc(sql`(select count(*) from ${officeHourQuestionVotes} v where v.question_id = "office_hour_questions"."id")`), asc(officeHourQuestions.createdAt))
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    userId: r.userId,
    displayName: r.deletedAt ? '退会ユーザー' : r.displayName,
    avatarUrl: r.deletedAt ? null : r.avatarUrl,
    voteCount: Number(r.voteCount),
    votedByMe: Boolean(r.votedByMe),
  }))
}

export async function countAttendees(officeHourId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(officeHourAttendance).where(eq(officeHourAttendance.officeHourId, officeHourId))
  return row?.n ?? 0
}
