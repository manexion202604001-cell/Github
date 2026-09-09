import Link from 'next/link'
import { Lock, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { QaStatusBadge } from './QaStatusBadge'
import type { QaThreadListItem } from '@/lib/db/queries/qa'
import { cn, formatRelative } from '@/lib/utils'

/** 一覧の 1 行（会員向け・管理画面共通） */
export function QaThreadRow({ thread, highlight = false }: { thread: QaThreadListItem; highlight?: boolean }) {
  return (
    <li className={cn(highlight && 'border-l border-state-warning pl-3')}>
      <Link href={`/qa/${thread.id}`} className="flex gap-4 py-5 no-underline hover:text-ink-700">
        <Avatar name={thread.authorName} src={thread.authorAvatarUrl} size={36} className="mt-0.5 hidden sm:inline-flex" />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <QaStatusBadge status={thread.status} />
            {thread.courseTitle && <Badge>{thread.courseTitle}</Badge>}
            {thread.isFaq && <Badge variant="muted">FAQ</Badge>}
            {thread.isPrivate && (
              <span className="caption inline-flex items-center gap-1">
                <Lock className="size-3 stroke-[1.5]" />
                非公開
              </span>
            )}
          </div>
          <p className="font-serif text-[16px] leading-[1.6] text-ink-900">{thread.title}</p>
          <p className="caption tnum mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{thread.authorName}</span>
            <span>{formatRelative(thread.updatedAt)}</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3 stroke-[1.5]" />
              {thread.replyCount}
            </span>
            {thread.officialCount > 0 && <span className="text-bronze-500">公式回答 {thread.officialCount}</span>}
          </p>
        </div>
      </Link>
    </li>
  )
}
