import Link from 'next/link'
import { Suspense } from 'react'
import { MessageSquare, Pin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { SignedImage } from '@/components/shared/SignedImage'
import { formatDateTime, formatRelative, ROLE_LABEL } from '@/lib/utils'
import { firstUrl } from '@/lib/ogp'
import type { PostListItem } from '@/lib/db/queries/community'
import { MentionText } from './MentionText'
import { ReactionBar } from './ReactionBar'
import { LinkPreview } from './LinkPreview'
import { AuthorAvatar, AuthorName } from './CommentList'

/**
 * COM-02: 投稿カード。variant='detail' は投稿詳細ページ用（本文全文・チャンネルリンク・絶対日時）。
 * フィードでは本文をそのまま表示し、コメントへの導線を置く。
 */
export function PostCard({ post, variant = 'feed', showChannel = true, actions }: { post: PostListItem; variant?: 'feed' | 'detail'; showChannel?: boolean; actions?: React.ReactNode }) {
  const url = firstUrl(post.bodyMd)
  const detailHref = `/community/posts/${post.id}`
  return (
    <article className="rounded border bg-paper-200 p-5 transition-colors md:p-6" aria-labelledby={`post-${post.id}-author`}>
      <header className="flex items-start gap-3 md:gap-4">
        <AuthorAvatar author={post.author} size={40} />
        <div className="min-w-0 flex-1">
          <div id={`post-${post.id}-author`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <AuthorName author={post.author} />
            {post.author.role !== 'student' && !post.author.deleted && <Badge variant="status">{ROLE_LABEL[post.author.role]}</Badge>}
            {post.isPinned && (
              <span className="inline-flex items-center gap-1 font-sans text-[11px] tracking-wider text-bronze-500">
                <Pin className="size-3 stroke-[1.5]" aria-hidden />
                ピン留め
              </span>
            )}
            {post.isHidden && <Badge variant="muted">非表示</Badge>}
          </div>
          <p className="caption mt-0.5 flex flex-wrap items-center gap-x-2">
            {showChannel && (
              <Link href={`/community/${post.channel.slug}`} className="no-underline hover:text-bronze-500">
                #{post.channel.name}
              </Link>
            )}
            {variant === 'detail' ? (
              <time dateTime={post.createdAt.toISOString()}>{formatDateTime(post.createdAt)}</time>
            ) : (
              <Link href={detailHref} className="no-underline hover:text-bronze-500">
                <time dateTime={post.createdAt.toISOString()}>{formatRelative(post.createdAt)}</time>
              </Link>
            )}
            {post.updatedAt.getTime() - post.createdAt.getTime() > 60_000 && <span>（編集済み）</span>}
          </p>
        </div>
      </header>

      <div className="mt-4 md:pl-14">
        <MentionText text={post.bodyMd} mentions={post.mentions} />
        {post.attachmentPaths.length > 0 && (
          <ul className={post.attachmentPaths.length === 1 ? 'mt-4 max-w-prose' : 'mt-4 grid max-w-prose grid-cols-2 gap-2'}>
            {post.attachmentPaths.map((p) => (
              <li key={p} className="overflow-hidden rounded border bg-paper-100">
                <SignedImage path={p} alt="" className="max-h-[480px] w-full object-cover" />
              </li>
            ))}
          </ul>
        )}
        {url && (
          <Suspense fallback={null}>
            <LinkPreview url={url} />
          </Suspense>
        )}
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <ReactionBar targetType="post" targetId={post.id} reactions={post.reactions} />
          <div className="flex items-center gap-2">
            {variant === 'feed' && (
              <Link href={detailHref} className="inline-flex h-8 items-center gap-1.5 font-sans text-[13px] tracking-[0.04em] text-stone-500 no-underline hover:text-bronze-500">
                <MessageSquare className="size-4 stroke-[1.5]" aria-hidden />
                <span className="tnum">{post.commentCount}</span>
                <span className="sr-only">件のコメント</span>
              </Link>
            )}
            {actions}
          </div>
        </footer>
      </div>
    </article>
  )
}
