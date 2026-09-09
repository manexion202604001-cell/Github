import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Lock } from 'lucide-react'
import { requireUser, isStaff } from '@/lib/auth'
import { getThreadView, type QaAuthor } from '@/lib/db/queries/qa'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Markdown } from '@/components/ui/Markdown'
import { Button } from '@/components/ui/Button'
import { SignedImage } from '@/components/shared/SignedImage'
import { QaStatusBadge } from '@/components/qa/QaStatusBadge'
import { ReplyForm } from '@/components/qa/ReplyForm'
import { ThreadActions } from '@/components/qa/ThreadActions'
import { cn, formatDateTime, ROLE_LABEL } from '@/lib/utils'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const user = await requireUser()
  const view = UUID_RE.test(threadId) ? await getThreadView(threadId, user.profile) : null
  return { title: view ? view.thread.title : 'Q&A' }
}

function AuthorLine({ author, at }: { author: QaAuthor; at: Date }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={author.displayName} src={author.avatarUrl} size={32} />
      <div className="min-w-0">
        <p className="ui-label text-ink-900">
          {author.deleted ? author.displayName : <Link href={`/members/${author.id}`} className="no-underline hover:text-bronze-500">{author.displayName}</Link>}
          {author.role !== 'student' && <span className="caption ml-2">{ROLE_LABEL[author.role]}</span>}
        </p>
        <p className="caption tnum">{formatDateTime(at)}</p>
      </div>
    </div>
  )
}

function ImageGrid({ items }: { items: { id: string; storagePath: string }[] }) {
  if (items.length === 0) return null
  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((a) => (
        <li key={a.id} className="overflow-hidden rounded border bg-paper-200">
          <SignedImage path={a.storagePath} alt="添付画像" className="aspect-[4/3] w-full object-cover" />
        </li>
      ))}
    </ul>
  )
}

export default async function QaThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const user = await requireUser()
  const { threadId } = await params
  if (!UUID_RE.test(threadId)) notFound()
  const view = await getThreadView(threadId, user.profile)
  if (!view) notFound()
  const { thread, author, course, lesson, replies } = view
  const staff = isStaff(user.profile)
  const owner = thread.userId === user.id
  const canReply = staff || owner

  return (
    <div className="mx-auto max-w-prose">
      <Link href="/qa" className="caption inline-flex items-center gap-1 no-underline hover:text-bronze-500">
        <ArrowLeft className="size-3 stroke-[1.5]" />
        Q&A 一覧へ
      </Link>
      <PageHeader eyebrow="Official Q&A" title={thread.title} className="mt-4 mb-6" />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <QaStatusBadge status={thread.status} />
        {course && (
          <Link href={`/courses/${course.slug}`} className="no-underline">
            <Badge>{course.title}</Badge>
          </Link>
        )}
        {lesson && course && (
          <Link href={`/courses/${course.slug}/lessons/${lesson.id}`} className="no-underline">
            <Badge>{lesson.title}</Badge>
          </Link>
        )}
        {thread.isFaq && <Badge variant="muted">FAQ</Badge>}
        {thread.isPrivate && (
          <span className="caption inline-flex items-center gap-1">
            <Lock className="size-3 stroke-[1.5]" />
            非公開（自分と講師のみ閲覧可）
          </span>
        )}
      </div>

      <article className="border-b pb-10">
        <AuthorLine author={author} at={thread.createdAt} />
        <Markdown className="mt-6">{thread.bodyMd}</Markdown>
        <ImageGrid items={view.attachments} />
      </article>

      <div className="py-6">
        <ThreadActions threadId={thread.id} status={thread.status} isFaq={thread.isFaq} isPrivate={thread.isPrivate} isOwner={owner} isStaff={staff} />
      </div>

      <section aria-label="返信">
        <p className="eyebrow mb-4">Replies ・ {replies.length}</p>
        {replies.length === 0 ? (
          <p className="text-[15px] text-stone-500">まだ回答はありません。講師が順に回答します。</p>
        ) : (
          <ul className="space-y-4">
            {replies.map((r) => (
              <li key={r.id} className={cn('rounded border p-5 md:p-6', r.isOfficial ? 'border-bronze-500 bg-paper-200' : 'bg-paper-100')}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <AuthorLine author={r.author} at={r.createdAt} />
                  {r.isOfficial && <Badge variant="official">公式回答</Badge>}
                </div>
                <Markdown className="mt-5">{r.bodyMd}</Markdown>
                <ImageGrid items={r.attachments} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border-t pt-10" aria-label="返信フォーム">
        {canReply ? (
          <>
            <h2 className="mb-6 text-[20px]">{staff ? '公式回答を書く' : '追加で質問する'}</h2>
            <ReplyForm threadId={thread.id} isStaff={staff} />
          </>
        ) : (
          <p className="text-[15px] text-stone-500">このスレッドに返信できるのは講師と質問者のみです。</p>
        )}
      </section>

      <aside className="mt-16 rounded border bg-paper-200 p-6">
        <p className="font-serif text-[15px]">受講生同士の相談は、コミュニティの「つまずき相談」へ。</p>
        <Button variant="ghost" size="sm" asChild className="mt-2 -ml-4">
          <Link href="/community/help">つまずき相談を開く</Link>
        </Button>
      </aside>
    </div>
  )
}
