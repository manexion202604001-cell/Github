import 'server-only'
import { and, asc, count, desc, eq, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appSettings, attachments, courses, lessons, profiles, qaReplies, qaThreads, sections, type Profile, type QaThread } from '@/lib/db/schema'
import { isStaff } from '@/lib/auth'

export type QaViewer = Pick<Profile, 'id' | 'role'>
export type QaStatus = QaThread['status']

export const QA_STATUS_LABEL: Record<QaStatus, string> = {
  open: '未回答',
  answered: '回答済',
  resolved: '解決済',
}

/** 退会ユーザーは表示名を伏せる（preamble 厳守事項） */
export function displayNameOf(p: { displayName: string; deletedAt: Date | null } | null | undefined): string {
  if (!p || p.deletedAt) return '退会ユーザー'
  return p.displayName
}

/** 閲覧者に応じた可視条件（private は本人 + staff のみ） */
function visibleTo(viewer: QaViewer): SQL | undefined {
  if (isStaff(viewer)) return undefined
  return or(eq(qaThreads.isPrivate, false), eq(qaThreads.userId, viewer.id))
}

export type QaThreadListItem = {
  id: string
  title: string
  status: QaStatus
  isPrivate: boolean
  isFaq: boolean
  createdAt: Date
  updatedAt: Date
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  courseId: string | null
  courseTitle: string | null
  courseSlug: string | null
  replyCount: number
  officialCount: number
}

function listSelection() {
  return {
    id: qaThreads.id,
    title: qaThreads.title,
    status: qaThreads.status,
    isPrivate: qaThreads.isPrivate,
    isFaq: qaThreads.isFaq,
    createdAt: qaThreads.createdAt,
    updatedAt: qaThreads.updatedAt,
    authorId: qaThreads.userId,
    authorDisplayName: profiles.displayName,
    authorDeletedAt: profiles.deletedAt,
    authorAvatarUrl: profiles.avatarUrl,
    courseId: qaThreads.courseId,
    courseTitle: courses.title,
    courseSlug: courses.slug,
    replyCount: sql<number>`(select count(*) from ${qaReplies} r where r.thread_id = "qa_threads"."id")`,
    officialCount: sql<number>`(select count(*) from ${qaReplies} r where r.thread_id = "qa_threads"."id" and r.is_official)`,
  }
}

type ListRow = {
  authorDisplayName: string
  authorDeletedAt: Date | null
  authorAvatarUrl: string | null
  replyCount: number | string
  officialCount: number | string
} & Omit<QaThreadListItem, 'authorName' | 'authorAvatarUrl' | 'replyCount' | 'officialCount'>

function toListItem(r: ListRow): QaThreadListItem {
  const { authorDisplayName, authorDeletedAt, authorAvatarUrl, replyCount, officialCount, ...rest } = r
  const deleted = authorDeletedAt != null
  return {
    ...rest,
    authorName: displayNameOf({ displayName: authorDisplayName, deletedAt: authorDeletedAt }),
    authorAvatarUrl: deleted ? null : authorAvatarUrl,
    replyCount: Number(replyCount),
    officialCount: Number(officialCount),
  }
}

/** QA-06: 一覧（全文検索 + コース・ステータス絞り込み。private は本人 + staff のみ） */
export async function listThreads(
  viewer: QaViewer,
  opts: { q?: string | null; courseId?: string | null; status?: string | null; mine?: boolean; limit?: number } = {},
): Promise<QaThreadListItem[]> {
  const conds: (SQL | undefined)[] = [visibleTo(viewer)]
  const q = opts.q?.trim()
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
    // 'simple' 辞書の全文検索（英数語向け）+ ilike フォールバック（日本語は分かち書きされないため）
    conds.push(
      or(
        sql`to_tsvector('simple', ${qaThreads.title} || ' ' || ${qaThreads.bodyMd}) @@ plainto_tsquery('simple', ${q})`,
        sql`${qaThreads.title} ilike ${like}`,
        sql`${qaThreads.bodyMd} ilike ${like}`,
      ),
    )
  }
  if (opts.courseId) conds.push(eq(qaThreads.courseId, opts.courseId))
  if (opts.status === 'open' || opts.status === 'answered' || opts.status === 'resolved') conds.push(eq(qaThreads.status, opts.status))
  if (opts.mine) conds.push(eq(qaThreads.userId, viewer.id))

  const rows = await db
    .select(listSelection())
    .from(qaThreads)
    .innerJoin(profiles, eq(profiles.id, qaThreads.userId))
    .leftJoin(courses, eq(courses.id, qaThreads.courseId))
    .where(and(...conds))
    .orderBy(desc(qaThreads.updatedAt), desc(qaThreads.createdAt))
    .limit(opts.limit ?? 100)
  return rows.map(toListItem)
}

/** QA-07 / ADM-06: 未回答一覧（古い順）。24 時間超は `overdue` */
export async function listUnansweredThreads(limit = 100): Promise<(QaThreadListItem & { overdue: boolean })[]> {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const rows = await db
    .select(listSelection())
    .from(qaThreads)
    .innerJoin(profiles, eq(profiles.id, qaThreads.userId))
    .leftJoin(courses, eq(courses.id, qaThreads.courseId))
    .where(eq(qaThreads.status, 'open'))
    .orderBy(asc(qaThreads.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...toListItem(r), overdue: r.createdAt < threshold }))
}

export async function countUnansweredThreads(): Promise<{ total: number; overdue: number }> {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [total] = await db.select({ n: count() }).from(qaThreads).where(eq(qaThreads.status, 'open'))
  const [overdue] = await db
    .select({ n: count() })
    .from(qaThreads)
    .where(and(eq(qaThreads.status, 'open'), lt(qaThreads.createdAt, threshold)))
  return { total: total?.n ?? 0, overdue: overdue?.n ?? 0 }
}

export type QaAuthor = {
  id: string
  displayName: string
  avatarUrl: string | null
  role: Profile['role']
  deleted: boolean
}

export type QaReplyView = {
  id: string
  bodyMd: string
  isOfficial: boolean
  createdAt: Date
  author: QaAuthor
  attachments: { id: string; storagePath: string }[]
}

export type QaThreadView = {
  thread: QaThread
  author: QaAuthor
  course: { id: string; slug: string; title: string } | null
  lesson: { id: string; title: string } | null
  attachments: { id: string; storagePath: string }[]
  replies: QaReplyView[]
}

function toAuthor(p: Pick<Profile, 'id' | 'displayName' | 'avatarUrl' | 'role' | 'deletedAt'>): QaAuthor {
  const deleted = p.deletedAt != null
  return { id: p.id, displayName: displayNameOf(p), avatarUrl: deleted ? null : p.avatarUrl, role: p.role, deleted }
}

/** スレッド詳細（返信・添付・投稿者情報）。閲覧権限がなければ null */
export async function getThreadView(threadId: string, viewer: QaViewer): Promise<QaThreadView | null> {
  const thread = await db.query.qaThreads.findFirst({ where: eq(qaThreads.id, threadId) })
  if (!thread) return null
  if (thread.isPrivate && thread.userId !== viewer.id && !isStaff(viewer)) return null

  const [authorRow, course, lesson, threadAtts, replyRows] = await Promise.all([
    db.query.profiles.findFirst({
      where: eq(profiles.id, thread.userId),
      columns: { id: true, displayName: true, avatarUrl: true, role: true, deletedAt: true },
    }),
    thread.courseId
      ? db.query.courses.findFirst({ where: eq(courses.id, thread.courseId), columns: { id: true, slug: true, title: true } })
      : Promise.resolve(null),
    thread.lessonId ? db.query.lessons.findFirst({ where: eq(lessons.id, thread.lessonId), columns: { id: true, title: true } }) : Promise.resolve(null),
    db
      .select({ id: attachments.id, storagePath: attachments.storagePath })
      .from(attachments)
      .where(and(eq(attachments.targetType, 'qa_thread'), eq(attachments.targetId, thread.id)))
      .orderBy(asc(attachments.createdAt)),
    db
      .select({ reply: qaReplies, profile: profiles })
      .from(qaReplies)
      .innerJoin(profiles, eq(profiles.id, qaReplies.userId))
      .where(eq(qaReplies.threadId, thread.id))
      .orderBy(asc(qaReplies.createdAt)),
  ])

  const replyIds = replyRows.map((r) => r.reply.id)
  const replyAtts = replyIds.length
    ? await db
        .select({ id: attachments.id, storagePath: attachments.storagePath, targetId: attachments.targetId })
        .from(attachments)
        .where(and(eq(attachments.targetType, 'qa_reply'), inArray(attachments.targetId, replyIds)))
        .orderBy(asc(attachments.createdAt))
    : []

  const author: QaAuthor = authorRow
    ? toAuthor(authorRow)
    : { id: thread.userId, displayName: '退会ユーザー', avatarUrl: null, role: 'student', deleted: true }

  return {
    thread,
    author,
    course: course ?? null,
    lesson: lesson ?? null,
    attachments: threadAtts,
    replies: replyRows.map((r) => ({
      id: r.reply.id,
      bodyMd: r.reply.bodyMd,
      isOfficial: r.reply.isOfficial,
      createdAt: r.reply.createdAt,
      author: toAuthor(r.profile),
      attachments: replyAtts.filter((a) => a.targetId === r.reply.id).map((a) => ({ id: a.id, storagePath: a.storagePath })),
    })),
  }
}

export type FaqItem = {
  id: string
  title: string
  bodyMd: string
  courseTitle: string | null
  updatedAt: Date
  answers: { id: string; bodyMd: string; createdAt: Date; replierName: string }[]
}

/** QA-05: FAQ 一覧（is_faq かつ非 private。質問者名は出さない。公式回答のみ） */
export async function listFaqThreads(): Promise<FaqItem[]> {
  const threads = await db
    .select({ id: qaThreads.id, title: qaThreads.title, bodyMd: qaThreads.bodyMd, updatedAt: qaThreads.updatedAt, courseTitle: courses.title })
    .from(qaThreads)
    .leftJoin(courses, eq(courses.id, qaThreads.courseId))
    .where(and(eq(qaThreads.isFaq, true), eq(qaThreads.isPrivate, false)))
    .orderBy(desc(qaThreads.updatedAt))
  if (threads.length === 0) return []
  const ids = threads.map((t) => t.id)
  const answers = await db
    .select({
      id: qaReplies.id,
      threadId: qaReplies.threadId,
      bodyMd: qaReplies.bodyMd,
      createdAt: qaReplies.createdAt,
      replierName: profiles.displayName,
      replierDeletedAt: profiles.deletedAt,
    })
    .from(qaReplies)
    .innerJoin(profiles, eq(profiles.id, qaReplies.userId))
    .where(and(inArray(qaReplies.threadId, ids), eq(qaReplies.isOfficial, true)))
    .orderBy(asc(qaReplies.createdAt))
  return threads.map((t) => ({
    ...t,
    answers: answers
      .filter((a) => a.threadId === t.id)
      .map((a) => ({
        id: a.id,
        bodyMd: a.bodyMd,
        createdAt: a.createdAt,
        replierName: displayNameOf({ displayName: a.replierName, deletedAt: a.replierDeletedAt }),
      })),
  }))
}

export type FaqVisibility = 'public' | 'members'

/** app_settings.faq_visibility（既定 'public'） */
export async function getFaqVisibility(): Promise<FaqVisibility> {
  // TODO(decision-#6): FAQ ページの公開範囲は未決。仮置きとして app_settings（既定 'public'）で切替可能にしている
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, 'faq_visibility') })
  return row?.value === 'members' ? 'members' : 'public'
}

/** 質問フォームのコース選択肢（公開コースのみ） */
export async function listCoursesForQa(): Promise<{ id: string; title: string }[]> {
  return db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.status, 'published'))
    .orderBy(asc(courses.sortOrder), asc(courses.title))
}

/** searchParams の lesson から初期値を補完するための最小情報 */
export async function getLessonForQa(lessonId: string): Promise<{ id: string; title: string; courseId: string } | null> {
  const row = await db
    .select({ id: lessons.id, title: lessons.title, courseId: sections.courseId })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(lessons.id, lessonId))
    .then((r) => r[0])
  return row ?? null
}
