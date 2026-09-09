'use client'
import Link from 'next/link'
import { markRead } from '@/lib/actions/notifications'
import { Dot } from '@/components/ui/Badge'
import { formatRelative } from '@/lib/utils'

export type NotificationRow = { id: string; title: string; body: string | null; link: string | null; readAt: Date | null; createdAt: Date }

/** 通知 1 件。リンクがあれば遷移時に既読化する */
export function NotificationItem({ n }: { n: NotificationRow }) {
  const unread = !n.readAt
  const inner = (
    <>
      <span className="pt-2">{unread ? <Dot /> : <span className="inline-block size-1.5" />}</span>
      <span className="min-w-0 flex-1">
        <span className={unread ? 'block font-serif text-[15px] text-ink-900' : 'block font-serif text-[15px] text-ink-700'}>{n.title}</span>
        {n.body && <span className="mt-0.5 block text-[14px] leading-[1.8] text-stone-500">{n.body}</span>}
        <span className="caption tnum mt-1 block">{formatRelative(n.createdAt)}</span>
      </span>
    </>
  )
  if (n.link) {
    return (
      <li>
        <Link
          href={n.link}
          className="flex items-start gap-3 py-4 no-underline transition-colors hover:text-bronze-500"
          onClick={() => {
            if (unread) void markRead(n.id)
          }}
        >
          {inner}
        </Link>
      </li>
    )
  }
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start gap-3 py-4 text-left"
        disabled={!unread}
        onClick={() => {
          if (unread) void markRead(n.id)
        }}
      >
        {inner}
      </button>
    </li>
  )
}
