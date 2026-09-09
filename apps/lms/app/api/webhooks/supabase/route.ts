import { NextResponse } from 'next/server'
import { and, eq, gte, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { notifications, profiles, qaThreads } from '@/lib/db/schema'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createNotification, sendEmailIfEnabled } from '@/lib/notify'
import { NewCourseEmail, QaAnsweredEmail } from '@/emails/templates'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Supabase Database Webhook（§8.2）。
 * 認証は Cron と同じ `Authorization: Bearer ${CRON_SECRET}`（Supabase 側の Webhook 設定で HTTP ヘッダーに指定する。README に記載）。
 */
const payloadSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  schema: z.string().optional(),
  record: z.record(z.unknown()).nullable().optional(),
  old_record: z.record(z.unknown()).nullable().optional(),
})

const qaReplySchema = z.object({
  id: z.string().uuid(),
  thread_id: z.string().uuid(),
  user_id: z.string().uuid(),
  is_official: z.boolean(),
})

const courseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
})

/** 公式回答 → 質問者に通知 + メール（Action 側で既に送っていれば skip） */
async function onOfficialReply(reply: z.infer<typeof qaReplySchema>) {
  const thread = await db.query.qaThreads.findFirst({ where: eq(qaThreads.id, reply.thread_id) })
  if (!thread) return { handled: false, reason: 'thread not found' }
  if (thread.userId === reply.user_id) return { handled: false, reason: 'self reply' }
  const link = `/qa/${thread.id}`
  const recent = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.userId, thread.userId),
      eq(notifications.type, 'qa_reply'),
      eq(notifications.link, link),
      gte(notifications.createdAt, new Date(Date.now() - 5 * 60 * 1000)),
    ),
  })
  if (recent) return { handled: false, reason: 'already notified' }
  const replier = await db.query.profiles.findFirst({ where: eq(profiles.id, reply.user_id), columns: { displayName: true, deletedAt: true } })
  const replierName = !replier || replier.deletedAt ? '退会ユーザー' : replier.displayName
  await createNotification({ userId: thread.userId, type: 'qa_reply', title: `「${thread.title}」に公式回答がつきました`, link })
  await sendEmailIfEnabled(
    thread.userId,
    'emailQaReply',
    `「${thread.title}」に公式回答がつきました`,
    QaAnsweredEmail({ title: thread.title, threadId: thread.id, replierName }),
  )
  return { handled: true }
}

/** コース公開（draft → published）→ 全会員に NewCourseEmail */
async function onCoursePublished(course: z.infer<typeof courseSchema>) {
  const members = await db.select({ id: profiles.id }).from(profiles).where(isNull(profiles.deletedAt))
  for (const m of members) {
    await sendEmailIfEnabled(
      m.id,
      'emailNewCourse',
      `新しいコース「${course.title}」が公開されました`,
      NewCourseEmail({ title: course.title, slug: course.slug, description: course.description ?? null }),
    )
  }
  return { handled: true, recipients: members.length }
}

export async function POST(req: Request) {
  const denied = verifyCronSecret(req)
  if (denied) return denied
  const parsed = payloadSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  const { type, table, record, old_record: old } = parsed.data

  try {
    if (table === 'qa_replies' && type === 'INSERT') {
      const reply = qaReplySchema.safeParse(record)
      if (reply.success && reply.data.is_official) return NextResponse.json({ ok: true, ...(await onOfficialReply(reply.data)) })
      return NextResponse.json({ ok: true, handled: false })
    }
    if (table === 'courses' && type === 'UPDATE') {
      const next = courseSchema.safeParse(record)
      const prevStatus = old && typeof old.status === 'string' ? old.status : null
      if (next.success && next.data.status === 'published' && prevStatus === 'draft') {
        return NextResponse.json({ ok: true, ...(await onCoursePublished(next.data)) })
      }
      return NextResponse.json({ ok: true, handled: false })
    }
    return NextResponse.json({ ok: true, handled: false })
  } catch (e) {
    console.error('[webhook:supabase] failed', e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
