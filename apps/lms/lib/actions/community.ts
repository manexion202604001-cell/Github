'use server'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, hasRole, isStaff, type CurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { withRls } from '@/lib/db/rls'
import { attachments, auditLogs, channelFollows, channels, comments, posts, profiles, qaReplies, qaThreads, reactions, reports } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { checkRateLimit } from '@/lib/rate-limit'
import { awardXp, checkBadges } from '@/lib/gamification'
import { createNotification, sendEmailIfEnabled } from '@/lib/notify'
import { MentionEmail } from '@/emails/templates'
import { extractMentions } from '@/lib/mentions'
import { truncate } from '@/lib/utils'

const uuid = z.string().uuid()
const bodySchema = z.string().trim().min(1, '本文を入力してください。').max(10_000, '本文は 10,000 文字以内にしてください。')
const imagePathsSchema = z.array(z.string().min(1).max(300)).max(4, '画像は 4 枚までです。').default([])
const reactionTarget = z.enum(['post', 'comment', 'qa_thread', 'qa_reply'])
const reactionKindSchema = z.enum(['clap', 'idea', 'thanks', 'fire'])
const reportTarget = z.enum(['post', 'comment', 'qa_thread', 'qa_reply'])
const hideTarget = z.enum(['post', 'comment'])

function firstIssue(e: z.ZodError): string {
  return e.issues[0]?.message ?? ERR.invalid
}

/** COM-05: メンション通知（本人は除外・退会ユーザーは除外） */
async function notifyMentions(actor: CurrentUser, bodyMd: string, link: string) {
  const names = extractMentions(bodyMd)
  if (names.length === 0) return
  const targets = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(inArray(profiles.displayName, names), isNull(profiles.deletedAt)))
  const from = actor.profile.displayName
  const excerpt = truncate(bodyMd.replace(/\s+/g, ' '), 80)
  await Promise.all(
    targets
      .filter((t) => t.id !== actor.id)
      .map(async (t) => {
        await createNotification({ userId: t.id, type: 'mention', title: `${from} さんがあなたをメンションしました`, body: excerpt, link })
        await sendEmailIfEnabled(t.id, 'emailMention', `${from} さんがあなたをメンションしました`, MentionEmail({ fromName: from, link, excerpt }))
      }),
  )
}

function revalidateCommunity(channelSlug?: string | null, postId?: string | null) {
  revalidatePath('/community')
  if (channelSlug) revalidatePath(`/community/${channelSlug}`)
  if (postId) revalidatePath(`/community/posts/${postId}`)
}

/** COM-02: 投稿を作成（画像添付は最大 4 枚） */
export async function createPost(channelId: string, bodyMd: string, imagePaths: string[] = []): Promise<ActionResult<{ postId: string }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const parsed = z.object({ channelId: uuid, bodyMd: bodySchema, imagePaths: imagePathsSchema }).safeParse({ channelId, bodyMd, imagePaths })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  if (!checkRateLimit(`post:${user.id}`)) return fail(ERR.rateLimited)

  const channel = await db.query.channels.findFirst({ where: eq(channels.id, parsed.data.channelId) })
  if (!channel) return fail(ERR.notFound)

  const postId = await withRls(user.id, async (tx) => {
    const [row] = await tx.insert(posts).values({ channelId: channel.id, userId: user.id, bodyMd: parsed.data.bodyMd }).returning({ id: posts.id })
    if (!row) throw new Error('insert failed')
    if (parsed.data.imagePaths.length > 0) {
      await tx.insert(attachments).values(parsed.data.imagePaths.map((p) => ({ targetType: 'post', targetId: row.id, storagePath: p })))
    }
    return row.id
  })

  const link = `/community/posts/${postId}`
  await awardXp(user.id, 'community_post', { type: 'post', id: postId })
  await checkBadges(user.id)
  await notifyMentions(user, parsed.data.bodyMd, link)
  revalidateCommunity(channel.slug, postId)
  return ok({ postId })
}

/** COM-02: 投稿を編集（本人のみ） */
export async function updatePost(postId: string, bodyMd: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const parsed = z.object({ postId: uuid, bodyMd: bodySchema }).safeParse({ postId, bodyMd })
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const post = await db.query.posts.findFirst({ where: eq(posts.id, parsed.data.postId) })
  if (!post) return fail(ERR.notFound)
  if (post.userId !== user.id) return fail(ERR.forbidden)

  await withRls(user.id, async (tx) => {
    await tx.update(posts).set({ bodyMd: parsed.data.bodyMd, updatedAt: new Date() }).where(eq(posts.id, post.id))
  })
  const channel = await db.query.channels.findFirst({ where: eq(channels.id, post.channelId) })
  revalidateCommunity(channel?.slug, post.id)
  return ok(undefined)
}

/** COM-02/07: 投稿を削除（本人 or admin） */
export async function deletePost(postId: string): Promise<ActionResult<{ channelSlug: string | null }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(postId)
  if (!id.success) return fail(ERR.invalid)

  const post = await db.query.posts.findFirst({ where: eq(posts.id, id.data) })
  if (!post) return fail(ERR.notFound)
  const isAdmin = hasRole(user.profile, 'admin')
  if (post.userId !== user.id && !isAdmin) return fail(ERR.forbidden)

  const commentIds = (await db.select({ id: comments.id }).from(comments).where(eq(comments.postId, post.id))).map((c) => c.id)
  await withRls(user.id, async (tx) => {
    await tx.delete(posts).where(eq(posts.id, post.id))
  })
  // 添付・リアクションは FK が無いためサーバー側で掃除する（コメントは FK でカスケード）
  await db.delete(attachments).where(and(eq(attachments.targetType, 'post'), eq(attachments.targetId, post.id)))
  await db.delete(reactions).where(and(eq(reactions.targetType, 'post'), eq(reactions.targetId, post.id)))
  if (commentIds.length > 0) await db.delete(reactions).where(and(eq(reactions.targetType, 'comment'), inArray(reactions.targetId, commentIds)))
  if (isAdmin && post.userId !== user.id) {
    await db.insert(auditLogs).values({ actorId: user.id, action: 'community.post.delete', targetType: 'post', targetId: post.id, detail: { ownerId: post.userId } })
    await db.update(reports).set({ resolvedAt: new Date() }).where(and(eq(reports.targetType, 'post'), eq(reports.targetId, post.id), isNull(reports.resolvedAt)))
  }
  const channel = await db.query.channels.findFirst({ where: eq(channels.id, post.channelId) })
  revalidateCommunity(channel?.slug, post.id)
  revalidatePath('/admin/community')
  return ok({ channelSlug: channel?.slug ?? null })
}

/** COM-03: コメントを作成（1 階層） */
export async function createComment(postId: string, bodyMd: string): Promise<ActionResult<{ commentId: string }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const parsed = z.object({ postId: uuid, bodyMd: bodySchema }).safeParse({ postId, bodyMd })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  if (!checkRateLimit(`comment:${user.id}`)) return fail(ERR.rateLimited)

  const post = await db.query.posts.findFirst({ where: eq(posts.id, parsed.data.postId) })
  if (!post) return fail(ERR.notFound)
  if (post.isHidden && post.userId !== user.id && !isStaff(user.profile)) return fail(ERR.notFound)

  const commentId = await withRls(user.id, async (tx) => {
    const [row] = await tx.insert(comments).values({ postId: post.id, userId: user.id, bodyMd: parsed.data.bodyMd }).returning({ id: comments.id })
    if (!row) throw new Error('insert failed')
    return row.id
  })

  const link = `/community/posts/${post.id}#comment-${commentId}`
  await awardXp(user.id, 'community_comment', { type: 'comment', id: commentId })
  await checkBadges(user.id)
  await notifyMentions(user, parsed.data.bodyMd, link)
  const channel = await db.query.channels.findFirst({ where: eq(channels.id, post.channelId) })
  revalidateCommunity(channel?.slug, post.id)
  return ok({ commentId })
}

/** COM-03/07: コメントを削除（本人 or admin） */
export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(commentId)
  if (!id.success) return fail(ERR.invalid)

  const comment = await db.query.comments.findFirst({ where: eq(comments.id, id.data) })
  if (!comment) return fail(ERR.notFound)
  const isAdmin = hasRole(user.profile, 'admin')
  if (comment.userId !== user.id && !isAdmin) return fail(ERR.forbidden)

  await withRls(user.id, async (tx) => {
    await tx.delete(comments).where(eq(comments.id, comment.id))
  })
  await db.delete(reactions).where(and(eq(reactions.targetType, 'comment'), eq(reactions.targetId, comment.id)))
  if (isAdmin && comment.userId !== user.id) {
    await db.insert(auditLogs).values({ actorId: user.id, action: 'community.comment.delete', targetType: 'comment', targetId: comment.id, detail: { ownerId: comment.userId } })
    await db.update(reports).set({ resolvedAt: new Date() }).where(and(eq(reports.targetType, 'comment'), eq(reports.targetId, comment.id), isNull(reports.resolvedAt)))
  }
  revalidateCommunity(null, comment.postId)
  revalidatePath('/admin/community')
  return ok(undefined)
}

type ReactionTargetType = z.infer<typeof reactionTarget>

/** リアクション対象の作者 ID を返す（存在しなければ null） */
async function findTargetOwner(targetType: ReactionTargetType, targetId: string): Promise<string | null> {
  switch (targetType) {
    case 'post':
      return (await db.query.posts.findFirst({ where: eq(posts.id, targetId), columns: { userId: true } }))?.userId ?? null
    case 'comment':
      return (await db.query.comments.findFirst({ where: eq(comments.id, targetId), columns: { userId: true } }))?.userId ?? null
    case 'qa_thread':
      return (await db.query.qaThreads.findFirst({ where: eq(qaThreads.id, targetId), columns: { userId: true } }))?.userId ?? null
    case 'qa_reply':
      return (await db.query.qaReplies.findFirst({ where: eq(qaReplies.id, targetId), columns: { userId: true } }))?.userId ?? null
  }
}

/** COM-04: リアクションのトグル（4 種固定） */
export async function toggleReaction(
  targetType: 'post' | 'comment' | 'qa_thread' | 'qa_reply',
  targetId: string,
  kind: 'clap' | 'idea' | 'thanks' | 'fire',
): Promise<ActionResult<{ active: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const parsed = z.object({ targetType: reactionTarget, targetId: uuid, kind: reactionKindSchema }).safeParse({ targetType, targetId, kind })
  if (!parsed.success) return fail(ERR.invalid)
  if (!checkRateLimit(`reaction:${user.id}`, 60)) return fail(ERR.rateLimited)

  const owner = await findTargetOwner(parsed.data.targetType, parsed.data.targetId)
  if (!owner) return fail(ERR.notFound)

  const where = and(
    eq(reactions.userId, user.id),
    eq(reactions.targetType, parsed.data.targetType),
    eq(reactions.targetId, parsed.data.targetId),
    eq(reactions.kind, parsed.data.kind),
  )
  const existing = await db.query.reactions.findFirst({ where })
  const active = await withRls(user.id, async (tx) => {
    if (existing) {
      await tx.delete(reactions).where(where)
      return false
    }
    await tx.insert(reactions).values({ userId: user.id, targetType: parsed.data.targetType, targetId: parsed.data.targetId, kind: parsed.data.kind }).onConflictDoNothing()
    return true
  })

  if (active && owner !== user.id) {
    // 受け取った側に XP（1 日上限 20 は awardXp が処理。同一対象への重複付与は ref で防ぐ）
    await awardXp(owner, 'reaction_received', { type: 'reaction', id: parsed.data.targetId })
    await checkBadges(owner)
  }
  if (parsed.data.targetType === 'post') revalidateCommunity(null, parsed.data.targetId)
  return ok({ active })
}

/** COM-07: 通報 → 全 admin に通知 */
export async function reportContent(targetType: 'post' | 'comment' | 'qa_thread' | 'qa_reply', targetId: string, reason: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const parsed = z
    .object({ targetType: reportTarget, targetId: uuid, reason: z.string().trim().min(1, '通報理由を入力してください。').max(1000) })
    .safeParse({ targetType, targetId, reason })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  if (!checkRateLimit(`report:${user.id}`, 5)) return fail(ERR.rateLimited)

  const owner = await findTargetOwner(parsed.data.targetType, parsed.data.targetId)
  if (!owner) return fail(ERR.notFound)

  const dup = await db.query.reports.findFirst({
    where: and(eq(reports.reporterId, user.id), eq(reports.targetType, parsed.data.targetType), eq(reports.targetId, parsed.data.targetId), isNull(reports.resolvedAt)),
  })
  if (dup) return fail('この内容はすでに通報済みです。')

  await withRls(user.id, async (tx) => {
    await tx.insert(reports).values({ reporterId: user.id, targetType: parsed.data.targetType, targetId: parsed.data.targetId, reason: parsed.data.reason })
  })

  const admins = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.role, 'admin'), isNull(profiles.deletedAt)))
  await Promise.all(
    admins.map((a) =>
      createNotification({ userId: a.id, type: 'report', title: '投稿が通報されました', body: truncate(parsed.data.reason, 80), link: '/admin/community' }),
    ),
  )
  revalidatePath('/admin/community')
  return ok(undefined)
}

/** COM-06: ピン留め（講師 / 管理者） */
export async function pinPost(postId: string, pinned: boolean): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  if (!isStaff(user.profile)) return fail(ERR.forbidden)
  const parsed = z.object({ postId: uuid, pinned: z.boolean() }).safeParse({ postId, pinned })
  if (!parsed.success) return fail(ERR.invalid)

  const post = await db.query.posts.findFirst({ where: eq(posts.id, parsed.data.postId) })
  if (!post) return fail(ERR.notFound)
  await withRls(user.id, async (tx) => {
    await tx.update(posts).set({ isPinned: parsed.data.pinned, updatedAt: new Date() }).where(eq(posts.id, post.id))
  })
  const channel = await db.query.channels.findFirst({ where: eq(channels.id, post.channelId) })
  revalidateCommunity(channel?.slug, post.id)
  return ok(undefined)
}

/** COM-07: 非表示 / 再表示（admin。audit_logs に記録） */
export async function hideContent(targetType: 'post' | 'comment', targetId: string, hidden: boolean): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  if (!hasRole(user.profile, 'admin')) return fail(ERR.forbidden)
  const parsed = z.object({ targetType: hideTarget, targetId: uuid, hidden: z.boolean() }).safeParse({ targetType, targetId, hidden })
  if (!parsed.success) return fail(ERR.invalid)

  let postId: string | null = null
  if (parsed.data.targetType === 'post') {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, parsed.data.targetId) })
    if (!post) return fail(ERR.notFound)
    postId = post.id
    await withRls(user.id, async (tx) => {
      await tx.update(posts).set({ isHidden: parsed.data.hidden, updatedAt: new Date() }).where(eq(posts.id, post.id))
    })
  } else {
    const comment = await db.query.comments.findFirst({ where: eq(comments.id, parsed.data.targetId) })
    if (!comment) return fail(ERR.notFound)
    postId = comment.postId
    await withRls(user.id, async (tx) => {
      await tx.update(comments).set({ isHidden: parsed.data.hidden }).where(eq(comments.id, comment.id))
    })
  }
  await db.insert(auditLogs).values({
    actorId: user.id,
    action: parsed.data.hidden ? 'community.hide' : 'community.unhide',
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    detail: { hidden: parsed.data.hidden },
  })
  if (parsed.data.hidden) {
    await db
      .update(reports)
      .set({ resolvedAt: new Date() })
      .where(and(eq(reports.targetType, parsed.data.targetType), eq(reports.targetId, parsed.data.targetId), isNull(reports.resolvedAt)))
  }
  revalidateCommunity(null, postId)
  revalidatePath('/admin/community')
  return ok(undefined)
}

/** COM-08: チャンネルのフォロー切替 */
export async function toggleChannelFollow(channelId: string): Promise<ActionResult<{ followed: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const id = uuid.safeParse(channelId)
  if (!id.success) return fail(ERR.invalid)
  const channel = await db.query.channels.findFirst({ where: eq(channels.id, id.data) })
  if (!channel) return fail(ERR.notFound)

  const where = and(eq(channelFollows.userId, user.id), eq(channelFollows.channelId, channel.id))
  const existing = await db.query.channelFollows.findFirst({ where })
  const followed = await withRls(user.id, async (tx) => {
    if (existing) {
      await tx.delete(channelFollows).where(where)
      return false
    }
    await tx.insert(channelFollows).values({ userId: user.id, channelId: channel.id }).onConflictDoNothing()
    return true
  })
  revalidateCommunity(channel.slug)
  return ok({ followed })
}
