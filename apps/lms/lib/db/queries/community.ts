import 'server-only'
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attachments, channelFollows, channels, comments, posts, profiles, reactions, reports, type Channel } from '@/lib/db/schema'
import { extractMentions } from '@/lib/mentions'
import { REACTIONS, type ReactionKind } from '@/lib/utils'

export const FEED_PAGE_SIZE = 20

/** 退会ユーザーは「退会ユーザー」として表示する（§4 / preamble） */
const displayNameSql = sql<string>`case when ${profiles.deletedAt} is null then ${profiles.displayName} else '退会ユーザー' end`
const avatarSql = sql<string | null>`case when ${profiles.deletedAt} is null then ${profiles.avatarUrl} else null end`

export type Author = { id: string; displayName: string; avatarUrl: string | null; role: 'student' | 'instructor' | 'admin'; deleted: boolean }
export type ReactionSummary = { kind: ReactionKind; count: number; mine: boolean }
export type MentionMap = Record<string, string>

export type ChannelWithFollow = Channel & { followed: boolean; postCount: number }

/** COM-01/08: チャンネル一覧（フォロー状態付き） */
export async function listChannels(userId: string): Promise<ChannelWithFollow[]> {
  const rows = await db
    .select({
      channel: channels,
      followed: sql<boolean>`${channelFollows.userId} is not null`,
      postCount: sql<number>`(select count(*) from ${posts} p where p.channel_id = ${channels.id} and p.is_hidden = false)`,
    })
    .from(channels)
    .leftJoin(channelFollows, and(eq(channelFollows.channelId, channels.id), eq(channelFollows.userId, userId)))
    .orderBy(asc(channels.sortOrder), asc(channels.name))
  return rows.map((r) => ({ ...r.channel, followed: Boolean(r.followed), postCount: Number(r.postCount) }))
}

export async function getChannelBySlug(slug: string): Promise<Channel | null> {
  const row = await db.query.channels.findFirst({ where: eq(channels.slug, slug) })
  return row ?? null
}

export type PostListItem = {
  id: string
  channel: { id: string; slug: string; name: string }
  author: Author
  bodyMd: string
  isPinned: boolean
  isHidden: boolean
  createdAt: Date
  updatedAt: Date
  commentCount: number
  reactions: ReactionSummary[]
  attachmentPaths: string[]
  mentions: MentionMap
}

type Viewer = { userId: string; isStaff: boolean }

/** 表示名 → userId（メンションリンク用）。退会ユーザーは対象外 */
export async function resolveMentionMap(texts: string[]): Promise<MentionMap> {
  const names = Array.from(new Set(texts.flatMap((t) => extractMentions(t))))
  if (names.length === 0) return {}
  const rows = await db
    .select({ id: profiles.id, name: profiles.displayName })
    .from(profiles)
    .where(and(inArray(profiles.displayName, names), isNull(profiles.deletedAt)))
  const map: MentionMap = {}
  for (const r of rows) map[r.name] = r.id
  return map
}

/** 対象 ID 群のリアクション集計（自分が押したものを含む） */
export async function getReactionSummaries(targetType: string, targetIds: string[], userId: string): Promise<Map<string, ReactionSummary[]>> {
  const result = new Map<string, ReactionSummary[]>()
  if (targetIds.length === 0) return result
  const list = await db
    .select({
      targetId: reactions.targetId,
      kind: reactions.kind,
      count: sql<number>`count(*)::int`,
      mine: sql<boolean>`bool_or(${reactions.userId} = ${userId})`,
    })
    .from(reactions)
    .where(and(eq(reactions.targetType, targetType), inArray(reactions.targetId, targetIds)))
    .groupBy(reactions.targetId, reactions.kind)
  for (const id of targetIds) {
    result.set(
      id,
      REACTIONS.map((r) => {
        const hit = list.find((x) => x.targetId === id && x.kind === r.kind)
        return { kind: r.kind, count: Number(hit?.count ?? 0), mine: Boolean(hit?.mine) }
      }),
    )
  }
  return result
}

async function getAttachmentMap(targetType: string, targetIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (targetIds.length === 0) return map
  const rows = await db
    .select({ targetId: attachments.targetId, path: attachments.storagePath })
    .from(attachments)
    .where(and(eq(attachments.targetType, targetType), inArray(attachments.targetId, targetIds)))
    .orderBy(asc(attachments.createdAt))
  for (const r of rows) map.set(r.targetId, [...(map.get(r.targetId) ?? []), r.path])
  return map
}

/** 非表示投稿は本人と staff のみ閲覧可（RLS posts_read と同じ条件） */
function visibleTo(viewer: Viewer) {
  return viewer.isStaff ? undefined : or(eq(posts.isHidden, false), eq(posts.userId, viewer.userId))
}

const postSelect = {
  post: posts,
  channelId: channels.id,
  channelSlug: channels.slug,
  channelName: channels.name,
  authorId: profiles.id,
  authorName: displayNameSql,
  authorAvatar: avatarSql,
  authorRole: profiles.role,
  authorDeleted: sql<boolean>`${profiles.deletedAt} is not null`,
  commentCount: sql<number>`(select count(*) from ${comments} c where c.post_id = ${posts.id} and c.is_hidden = false)`,
}

type PostRow = {
  post: typeof posts.$inferSelect
  channelId: string
  channelSlug: string
  channelName: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  authorRole: 'student' | 'instructor' | 'admin'
  authorDeleted: boolean
  commentCount: number
}

async function hydratePosts(rows: PostRow[], viewer: Viewer): Promise<PostListItem[]> {
  const ids = rows.map((r) => r.post.id)
  const [reactionMap, attachmentMap, mentions] = await Promise.all([
    getReactionSummaries('post', ids, viewer.userId),
    getAttachmentMap('post', ids),
    resolveMentionMap(rows.map((r) => r.post.bodyMd)),
  ])
  return rows.map((r) => ({
    id: r.post.id,
    channel: { id: r.channelId, slug: r.channelSlug, name: r.channelName },
    author: { id: r.authorId, displayName: r.authorName, avatarUrl: r.authorAvatar, role: r.authorRole, deleted: Boolean(r.authorDeleted) },
    bodyMd: r.post.bodyMd,
    isPinned: r.post.isPinned,
    isHidden: r.post.isHidden,
    createdAt: r.post.createdAt,
    updatedAt: r.post.updatedAt,
    commentCount: Number(r.commentCount),
    reactions: reactionMap.get(r.post.id) ?? [],
    attachmentPaths: attachmentMap.get(r.post.id) ?? [],
    mentions,
  }))
}

export type FeedResult = { posts: PostListItem[]; nextBefore: string | null }

/**
 * COM-08: フィード（時系列・新しい順）。
 * tab='following' はフォロー中チャンネルのみ。channelId 指定でチャンネル内。
 * `before`（ISO 日時）より前の投稿を PAGE_SIZE 件返す。
 */
export async function listFeed(
  viewer: Viewer,
  opts: { tab?: 'all' | 'following'; channelId?: string; before?: string | null; limit?: number } = {},
): Promise<FeedResult> {
  const limit = opts.limit ?? FEED_PAGE_SIZE
  const beforeDate = opts.before ? new Date(opts.before) : null
  const conds = [
    visibleTo(viewer),
    opts.channelId ? eq(posts.channelId, opts.channelId) : undefined,
    beforeDate && !Number.isNaN(beforeDate.getTime()) ? lt(posts.createdAt, beforeDate) : undefined,
    opts.tab === 'following'
      ? sql`exists (select 1 from ${channelFollows} f where f.channel_id = ${posts.channelId} and f.user_id = ${viewer.userId})`
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined)

  const rows = await db
    .select(postSelect)
    .from(posts)
    .innerJoin(channels, eq(channels.id, posts.channelId))
    .innerJoin(profiles, eq(profiles.id, posts.userId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const items = await hydratePosts(page, viewer)
  const last = page[page.length - 1]
  return { posts: items, nextBefore: hasMore && last ? last.post.createdAt.toISOString() : null }
}

/** COM-06: チャンネル内のピン留め投稿（上部表示用） */
export async function listPinnedPosts(viewer: Viewer, channelId: string): Promise<PostListItem[]> {
  const conds = [eq(posts.channelId, channelId), eq(posts.isPinned, true), visibleTo(viewer)].filter((c): c is NonNullable<typeof c> => c !== undefined)
  const rows = await db
    .select(postSelect)
    .from(posts)
    .innerJoin(channels, eq(channels.id, posts.channelId))
    .innerJoin(profiles, eq(profiles.id, posts.userId))
    .where(and(...conds))
    .orderBy(desc(posts.updatedAt))
    .limit(5)
  return hydratePosts(rows, viewer)
}

export type CommentItem = {
  id: string
  postId: string
  author: Author
  bodyMd: string
  isHidden: boolean
  createdAt: Date
  reactions: ReactionSummary[]
}

export type PostDetail = PostListItem & { comments: CommentItem[] }

/** COM-02/03: 投稿詳細（コメント 1 階層・添付・リアクション） */
export async function getPostDetail(postId: string, viewer: Viewer): Promise<PostDetail | null> {
  const conds = [eq(posts.id, postId), visibleTo(viewer)].filter((c): c is NonNullable<typeof c> => c !== undefined)
  const row = await db
    .select(postSelect)
    .from(posts)
    .innerJoin(channels, eq(channels.id, posts.channelId))
    .innerJoin(profiles, eq(profiles.id, posts.userId))
    .where(and(...conds))
    .then((r) => r[0])
  if (!row) return null

  const commentConds = [eq(comments.postId, postId), viewer.isStaff ? undefined : or(eq(comments.isHidden, false), eq(comments.userId, viewer.userId))].filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )
  const commentRows = await db
    .select({
      comment: comments,
      authorId: profiles.id,
      authorName: displayNameSql,
      authorAvatar: avatarSql,
      authorRole: profiles.role,
      authorDeleted: sql<boolean>`${profiles.deletedAt} is not null`,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.userId))
    .where(and(...commentConds))
    .orderBy(asc(comments.createdAt))

  const [postItem] = await hydratePosts([row], viewer)
  if (!postItem) return null
  const [commentReactions, mentions] = await Promise.all([
    getReactionSummaries(
      'comment',
      commentRows.map((c) => c.comment.id),
      viewer.userId,
    ),
    resolveMentionMap([row.post.bodyMd, ...commentRows.map((c) => c.comment.bodyMd)]),
  ])
  return {
    ...postItem,
    mentions,
    comments: commentRows.map((c) => ({
      id: c.comment.id,
      postId: c.comment.postId,
      author: { id: c.authorId, displayName: c.authorName, avatarUrl: c.authorAvatar, role: c.authorRole, deleted: Boolean(c.authorDeleted) },
      bodyMd: c.comment.bodyMd,
      isHidden: c.comment.isHidden,
      createdAt: c.comment.createdAt,
      reactions: commentReactions.get(c.comment.id) ?? [],
    })),
  }
}

export type ReportItem = {
  id: string
  targetType: string
  targetId: string
  reason: string | null
  createdAt: Date
  resolvedAt: Date | null
  reporter: { id: string; displayName: string }
  /** 対象の本文抜粋（削除済みなら null） */
  excerpt: string | null
  /** 対象の非表示状態（削除済みなら null） */
  hidden: boolean | null
  /** 対象へのリンク */
  link: string | null
}

/** COM-07 / ADM-07: 通報一覧（未解決を先に、新しい順） */
export async function listReports(): Promise<ReportItem[]> {
  const rows = await db
    .select({ report: reports, reporterId: profiles.id, reporterName: displayNameSql })
    .from(reports)
    .innerJoin(profiles, eq(profiles.id, reports.reporterId))
    .orderBy(sql`${reports.resolvedAt} is not null`, desc(reports.createdAt))
    .limit(200)

  const postIds = rows.filter((r) => r.report.targetType === 'post').map((r) => r.report.targetId)
  const commentIds = rows.filter((r) => r.report.targetType === 'comment').map((r) => r.report.targetId)
  const [postRows, commentRows] = await Promise.all([
    postIds.length ? db.select({ id: posts.id, body: posts.bodyMd, hidden: posts.isHidden }).from(posts).where(inArray(posts.id, postIds)) : [],
    commentIds.length
      ? db.select({ id: comments.id, body: comments.bodyMd, hidden: comments.isHidden, postId: comments.postId }).from(comments).where(inArray(comments.id, commentIds))
      : [],
  ])
  return rows.map((r) => {
    const t = r.report.targetType
    const post = t === 'post' ? postRows.find((p) => p.id === r.report.targetId) : undefined
    const comment = t === 'comment' ? commentRows.find((c) => c.id === r.report.targetId) : undefined
    const target = post ?? comment
    return {
      id: r.report.id,
      targetType: t,
      targetId: r.report.targetId,
      reason: r.report.reason,
      createdAt: r.report.createdAt,
      resolvedAt: r.report.resolvedAt,
      reporter: { id: r.reporterId, displayName: r.reporterName },
      excerpt: target ? target.body.slice(0, 120) : null,
      hidden: target ? target.hidden : null,
      link: post ? `/community/posts/${post.id}` : comment ? `/community/posts/${comment.postId}#comment-${comment.id}` : t === 'qa_thread' ? `/qa/${r.report.targetId}` : null,
    }
  })
}

/** ADM-07: チャンネル一覧（管理用） */
export async function listChannelsForAdmin(): Promise<(Channel & { postCount: number })[]> {
  const rows = await db
    .select({ channel: channels, postCount: sql<number>`(select count(*) from ${posts} p where p.channel_id = ${channels.id})` })
    .from(channels)
    .orderBy(asc(channels.sortOrder), asc(channels.name))
  return rows.map((r) => ({ ...r.channel, postCount: Number(r.postCount) }))
}
