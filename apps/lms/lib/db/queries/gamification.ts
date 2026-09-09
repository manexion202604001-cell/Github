import 'server-only'
import { and, asc, count, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { badges, certificates, courses, enrollments, profiles, userBadges, xpEvents, type Badge, type Profile } from '@/lib/db/schema'
import { XP_ACTION_LABEL, xpToLevel, type XpAction } from '@/lib/xp'
import { hasRole } from '@/lib/auth'

// ---------- ランキング（GAME-03） ----------

export type RankingRange = 'weekly' | 'monthly' | 'total'
export const RANKING_RANGES: RankingRange[] = ['weekly', 'monthly', 'total']
export const RANKING_LABEL: Record<RankingRange, string> = { weekly: '今週', monthly: '今月', total: '累計' }

export function parseRankingRange(v: string | undefined | null): RankingRange {
  return v === 'monthly' || v === 'total' ? v : 'weekly'
}

export type RankingRow = { userId: string; displayName: string; avatarUrl: string | null; xp: number; rank: number }
export type Ranking = {
  range: RankingRange
  top: RankingRow[]
  /** 自分の順位（view に無ければ null = 圏外） */
  me: RankingRow | null
  /** 自分が hide_from_ranking のとき true */
  optedOut: boolean
}

type RawRow = { user_id: string; display_name: string; avatar_url: string | null; xp: number | string; rank: number | string }

function toRow(r: RawRow): RankingRow {
  return { userId: r.user_id, displayName: r.display_name, avatarUrl: r.avatar_url, xp: Number(r.xp), rank: Number(r.rank) }
}

const VIEW_NAME: Record<RankingRange, string> = {
  weekly: 'public.ranking_weekly',
  monthly: 'public.ranking_monthly',
  total: 'public.ranking_total',
}

/** materialized view から読む（未作成・未 refresh なら throw） */
async function readRankingView(range: RankingRange, userId: string): Promise<{ top: RankingRow[]; me: RankingRow | null }> {
  const view = sql.raw(VIEW_NAME[range])
  const top = await db.execute<RawRow>(
    sql`select user_id, display_name, avatar_url, xp, rank from ${view} order by rank asc, display_name asc limit 20`,
  )
  const mine = await db.execute<RawRow>(sql`select user_id, display_name, avatar_url, xp, rank from ${view} where user_id = ${userId} limit 1`)
  const topRows = Array.from(top as Iterable<RawRow>)
  const mineRows = Array.from(mine as Iterable<RawRow>)
  return { top: topRows.map(toRow), me: mineRows[0] ? toRow(mineRows[0]) : null }
}

/** view と同等の集計を xp_events / profiles から直接行う（フォールバック） */
async function computeRankingFallback(range: RankingRange, userId: string): Promise<{ top: RankingRow[]; me: RankingRow | null }> {
  const base =
    range === 'total'
      ? sql`select p.id as user_id, p.display_name, p.avatar_url, p.total_xp as xp,
              rank() over (order by p.total_xp desc, p.created_at asc) as rank
            from public.profiles p
            where p.hide_from_ranking = false and p.deleted_at is null and p.total_xp > 0`
      : sql`with s as (
              select user_id, sum(xp) as xp from public.xp_events
              where created_at >= date_trunc(${range === 'weekly' ? 'week' : 'month'}, now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
              group by user_id
            )
            select p.id as user_id, p.display_name, p.avatar_url, s.xp,
              rank() over (order by s.xp desc, p.created_at asc) as rank
            from s join public.profiles p on p.id = s.user_id
            where p.hide_from_ranking = false and p.deleted_at is null`
  const rows = Array.from((await db.execute<RawRow>(sql`with r as (${base}) select * from r where rank <= 20 or user_id = ${userId} order by rank asc`)) as Iterable<RawRow>)
  const all = rows.map(toRow)
  return { top: all.filter((r) => r.rank <= 20).slice(0, 20), me: all.find((r) => r.userId === userId) ?? null }
}

/** 上位 20 名 + 自分の順位。view が使えないときは同等の集計にフォールバック */
export async function getRanking(range: RankingRange, viewer: Pick<Profile, 'id' | 'hideFromRanking'>): Promise<Ranking> {
  let result: { top: RankingRow[]; me: RankingRow | null }
  try {
    result = await readRankingView(range, viewer.id)
  } catch (e) {
    console.warn('[ranking] view unavailable, falling back to live aggregation', e instanceof Error ? e.message : e)
    result = await computeRankingFallback(range, viewer.id)
  }
  return { range, ...result, optedOut: viewer.hideFromRanking }
}

// ---------- XP 履歴（GAME-01） ----------

export type XpHistoryItem = { id: string; action: string; label: string; xp: number; createdAt: Date }

export async function getMyXpHistory(userId: string, limit = 30): Promise<XpHistoryItem[]> {
  const rows = await db
    .select({ id: xpEvents.id, action: xpEvents.action, xp: xpEvents.xp, createdAt: xpEvents.createdAt })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId))
    .orderBy(desc(xpEvents.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, label: XP_ACTION_LABEL[r.action as XpAction] ?? r.action }))
}

// ---------- バッジ（GAME-02） ----------

export type BadgeWithStatus = Badge & { earnedAt: Date | null }

/** 全バッジ + 自分の獲得状況（sort_order 順） */
export async function listBadgesWithStatus(userId: string): Promise<BadgeWithStatus[]> {
  const rows = await db
    .select({ badge: badges, earnedAt: userBadges.earnedAt })
    .from(badges)
    .leftJoin(userBadges, and(eq(userBadges.badgeId, badges.id), eq(userBadges.userId, userId)))
    .orderBy(asc(badges.sortOrder), asc(badges.name))
  return rows.map((r) => ({ ...r.badge, earnedAt: r.earnedAt }))
}

// ---------- 修了証（GAME-04） ----------

export type CertificateItem = {
  id: string
  courseId: string
  courseTitle: string
  courseSlug: string
  verifyCode: string
  issuedAt: Date
  pdfPath: string | null
}

export async function listMyCertificates(userId: string): Promise<CertificateItem[]> {
  return db
    .select({
      id: certificates.id,
      courseId: certificates.courseId,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      verifyCode: certificates.verifyCode,
      issuedAt: certificates.issuedAt,
      pdfPath: certificates.pdfPath,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt))
}

export type CertificateDetail = {
  id: string
  userId: string
  courseId: string
  courseTitle: string
  verifyCode: string
  issuedAt: Date
  pdfPath: string | null
  /** 受講者の表示名（退会済みなら「退会ユーザー」） */
  recipientName: string
  recipientDeleted: boolean
}

function mapCertificateDetail(r: {
  id: string
  userId: string
  courseId: string
  courseTitle: string
  verifyCode: string
  issuedAt: Date
  pdfPath: string | null
  displayName: string
  deletedAt: Date | null
}): CertificateDetail {
  return {
    id: r.id,
    userId: r.userId,
    courseId: r.courseId,
    courseTitle: r.courseTitle,
    verifyCode: r.verifyCode,
    issuedAt: r.issuedAt,
    pdfPath: r.pdfPath,
    recipientName: r.deletedAt ? '退会ユーザー' : r.displayName,
    recipientDeleted: !!r.deletedAt,
  }
}

const certificateDetailSelect = {
  id: certificates.id,
  userId: certificates.userId,
  courseId: certificates.courseId,
  courseTitle: courses.title,
  verifyCode: certificates.verifyCode,
  issuedAt: certificates.issuedAt,
  pdfPath: certificates.pdfPath,
  displayName: profiles.displayName,
  deletedAt: profiles.deletedAt,
}

/** PDF 生成用（認可は呼び出し側で行う） */
export async function getCertificateById(id: string): Promise<CertificateDetail | null> {
  const row = await db
    .select(certificateDetailSelect)
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .innerJoin(profiles, eq(profiles.id, certificates.userId))
    .where(eq(certificates.id, id))
    .then((r) => r[0])
  return row ? mapCertificateDetail(row) : null
}

/** 公開検証ページ用（ログイン不要。形式検証は呼び出し側で `isValidVerifyCode`） */
export async function getCertificateByVerifyCode(code: string): Promise<CertificateDetail | null> {
  const row = await db
    .select(certificateDetailSelect)
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .innerJoin(profiles, eq(profiles.id, certificates.userId))
    .where(eq(certificates.verifyCode, code))
    .then((r) => r[0])
  return row ? mapCertificateDetail(row) : null
}

// ---------- 公開プロフィール ----------

export type PublicProfile = {
  id: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  level: ReturnType<typeof xpToLevel>
  totalXp: number
  streakDays: number
  badges: { id: string; slug: string; name: string; description: string | null; icon: string | null; earnedAt: Date }[]
  completedCourses: number
  isPublic: boolean
  isSelf: boolean
}

/**
 * 公開プロフィール。`is_public=false` は本人と admin 以外 null（→ 404）。退会ユーザーも null。
 * メールアドレスは含めない。
 */
export async function getPublicProfile(userId: string, viewer: Pick<Profile, 'id' | 'role'>): Promise<PublicProfile | null> {
  const p = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) })
  if (!p || p.deletedAt) return null
  const isSelf = p.id === viewer.id
  if (!p.isPublic && !isSelf && !hasRole(viewer, 'admin')) return null

  const [earned, [done]] = await Promise.all([
    db
      .select({ id: badges.id, slug: badges.slug, name: badges.name, description: badges.description, icon: badges.icon, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, userId))
      .orderBy(asc(badges.sortOrder)),
    db
      .select({ n: count() })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), isNotNull(enrollments.completedAt))),
  ])

  return {
    id: p.id,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    level: xpToLevel(p.totalXp),
    totalXp: p.totalXp,
    streakDays: p.streakDays,
    badges: earned,
    completedCourses: done?.n ?? 0,
    isPublic: p.isPublic,
    isSelf,
  }
}
