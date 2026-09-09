import { NextResponse } from 'next/server'
import { and, count, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appSettings, lessonProgress, notificationSettings, officeHours, profiles, qaThreads, xpEvents } from '@/lib/db/schema'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createNotification, sendEmailIfEnabled } from '@/lib/notify'
import { getLastViewedLesson } from '@/lib/db/queries/learn'
import { OfficeHourReminderEmail, UnansweredAlertEmail, WeeklySummaryEmail } from '@/emails/templates'
import { appUrl, formatDateTime, toJstDateString } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const HOUR = 60 * 60 * 1000

async function activeMemberIds(): Promise<string[]> {
  const rows = await db.select({ id: profiles.id }).from(profiles).where(isNull(profiles.deletedAt))
  return rows.map((r) => r.id)
}

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) })
  return typeof row?.value === 'string' ? row.value : null
}

async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } })
}

/** オフィスアワーのリマインド（24 時間前 / 1 時間前）。§8.3 office-hour-reminder-24h / -1h */
async function remindOfficeHours(now: Date, members: string[]) {
  const result = { h24: 0, h1: 0 }
  const windows = [
    { hoursBefore: 24 as const, from: new Date(now.getTime() + 23 * HOUR), to: new Date(now.getTime() + 25 * HOUR), col: officeHours.reminded24hAt },
    { hoursBefore: 1 as const, from: new Date(now.getTime() + 30 * 60 * 1000), to: new Date(now.getTime() + 90 * 60 * 1000), col: officeHours.reminded1hAt },
  ]
  for (const w of windows) {
    const targets = await db
      .select()
      .from(officeHours)
      .where(and(gte(officeHours.scheduledAt, w.from), lt(officeHours.scheduledAt, w.to), isNull(w.col)))
    for (const oh of targets) {
      // 先に印を付けて二重送信を防ぐ
      const marked = await db
        .update(officeHours)
        .set(w.hoursBefore === 24 ? { reminded24hAt: now } : { reminded1hAt: now })
        .where(and(eq(officeHours.id, oh.id), isNull(w.col)))
        .returning({ id: officeHours.id })
      if (marked.length === 0) continue
      const subject = w.hoursBefore === 24 ? `【明日】オフィスアワー「${oh.title}」のご案内` : `【1 時間後】オフィスアワー「${oh.title}」のご案内`
      for (const userId of members) {
        await sendEmailIfEnabled(
          userId,
          'emailOfficeHour',
          subject,
          OfficeHourReminderEmail({ title: oh.title, when: formatDateTime(oh.scheduledAt), joinUrl: oh.joinUrl, id: oh.id, hoursBefore: w.hoursBefore }),
        )
      }
      if (w.hoursBefore === 24) result.h24++
      else result.h1++
    }
  }
  return result
}

/** 未回答質問アラート（24 時間以上 open）。1 日 1 回 */
async function alertUnanswered(now: Date, todayJst: string) {
  if ((await getSetting('unanswered_alert_last')) === todayJst) return { skipped: true, count: 0 }
  const [row] = await db
    .select({ n: count() })
    .from(qaThreads)
    .where(and(eq(qaThreads.status, 'open'), lt(qaThreads.createdAt, new Date(now.getTime() - 24 * HOUR))))
  const n = row?.n ?? 0
  if (n === 0) return { skipped: false, count: 0 }
  await setSetting('unanswered_alert_last', todayJst)
  const staff = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(isNull(profiles.deletedAt), sql`${profiles.role} in ('instructor', 'admin')`))
  const title = `24 時間以上未回答の質問が ${n} 件あります`
  for (const s of staff) {
    await createNotification({ userId: s.id, type: 'unanswered', title, link: '/admin/qa' })
    await sendEmailIfEnabled(s.id, null, title, UnansweredAlertEmail({ count: n }))
  }
  return { skipped: false, count: n, notified: staff.length }
}

/** 週間サマリー（JST 月曜 8 時台のみ、オプトイン者）。§8.3 weekly-summary */
async function sendWeeklySummary(now: Date, todayJst: string) {
  const jst = new Date(now.getTime() + 9 * HOUR)
  if (jst.getUTCDay() !== 1 || jst.getUTCHours() !== 8) return { skipped: true, sent: 0 }
  if ((await getSetting('weekly_summary_last')) === todayJst) return { skipped: true, sent: 0 }
  await setSetting('weekly_summary_last', todayJst)

  const since = new Date(now.getTime() - 7 * 24 * HOUR)
  const users = await db
    .select({ id: profiles.id, displayName: profiles.displayName, streakDays: profiles.streakDays })
    .from(profiles)
    .innerJoin(notificationSettings, eq(notificationSettings.userId, profiles.id))
    .where(and(isNull(profiles.deletedAt), eq(notificationSettings.emailWeeklySummary, true)))
  let sent = 0
  for (const u of users) {
    const [[xp], [done], last] = await Promise.all([
      db
        .select({ sum: sql<number>`coalesce(sum(${xpEvents.xp}), 0)` })
        .from(xpEvents)
        .where(and(eq(xpEvents.userId, u.id), gte(xpEvents.createdAt, since))),
      db
        .select({ n: count() })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, u.id), eq(lessonProgress.status, 'completed'), gte(lessonProgress.completedAt, since))),
      getLastViewedLesson(u.id),
    ])
    await sendEmailIfEnabled(
      u.id,
      'emailWeeklySummary',
      '今週の学習サマリー',
      WeeklySummaryEmail({
        displayName: u.displayName,
        xp: Number(xp?.sum ?? 0),
        lessons: done?.n ?? 0,
        streak: u.streakDays,
        nextLessonTitle: last?.lessonTitle ?? null,
        nextLessonUrl: last ? appUrl(`/courses/${last.courseSlug}/lessons/${last.lessonId}`) : null,
      }),
    )
    sent++
  }
  return { skipped: false, sent }
}

/** §8.2: Vercel Cron（毎時）。オフィスアワーリマインド・未回答質問アラート・週間サマリー */
export async function GET(req: Request) {
  const denied = verifyCronSecret(req)
  if (denied) return denied
  const now = new Date()
  const todayJst = toJstDateString(now)
  const result: Record<string, unknown> = { ranAt: now.toISOString() }
  try {
    const members = await activeMemberIds()
    result.officeHours = await remindOfficeHours(now, members)
    result.unanswered = await alertUnanswered(now, todayJst)
    result.weeklySummary = await sendWeeklySummary(now, todayJst)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron:reminders] failed', e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown', ...result }, { status: 500 })
  }
}
