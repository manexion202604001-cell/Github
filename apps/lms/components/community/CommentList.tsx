import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatRelative, ROLE_LABEL } from '@/lib/utils'
import type { CommentItem, MentionMap } from '@/lib/db/queries/community'
import { MentionText } from './MentionText'
import { ReactionBar } from './ReactionBar'
import { CommentActions } from './CommentActions'

/** COM-03: コメント一覧（1 階層・時系列） */
export function CommentList({ comments, mentions, viewerId, isAdmin }: { comments: CommentItem[]; mentions: MentionMap; viewerId: string; isAdmin: boolean }) {
  if (comments.length === 0) return <p className="py-8 text-center font-serif text-ink-700">まだコメントはありません。</p>
  return (
    <ul className="divide-y border-y">
      {comments.map((c) => (
        <li key={c.id} id={`comment-${c.id}`} className="flex gap-3 py-5 md:gap-4">
          <AuthorAvatar author={c.author} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <AuthorName author={c.author} />
              {c.author.role !== 'student' && !c.author.deleted && <Badge variant="status">{ROLE_LABEL[c.author.role]}</Badge>}
              <time dateTime={c.createdAt.toISOString()} className="caption">
                {formatRelative(c.createdAt)}
              </time>
              {c.isHidden && <Badge variant="muted">非表示</Badge>}
            </div>
            <MentionText text={c.bodyMd} mentions={mentions} className="mt-2 text-[15px]" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <ReactionBar targetType="comment" targetId={c.id} reactions={c.reactions} size="sm" />
              <CommentActions commentId={c.id} isOwner={c.author.id === viewerId} isAdmin={isAdmin} isHidden={c.isHidden} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function AuthorAvatar({ author, size = 36 }: { author: CommentItem['author']; size?: number }) {
  if (author.deleted) return <Avatar name={author.displayName} size={size} />
  return (
    <Link href={`/members/${author.id}`} className="shrink-0 no-underline">
      <Avatar name={author.displayName} src={author.avatarUrl} size={size} />
    </Link>
  )
}

export function AuthorName({ author }: { author: CommentItem['author'] }) {
  if (author.deleted) return <span className="font-sans text-[14px] tracking-[0.04em] text-stone-400">{author.displayName}</span>
  return (
    <Link href={`/members/${author.id}`} className="font-sans text-[14px] tracking-[0.04em] text-ink-900 no-underline hover:text-bronze-500">
      {author.displayName}
    </Link>
  )
}
