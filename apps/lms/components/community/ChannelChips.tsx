import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ChannelWithFollow } from '@/lib/db/queries/community'

/** COM-01: チャンネル一覧（横スクロールのチップ）。フォロー中はドットで示す */
export function ChannelChips({ channels, activeSlug, className }: { channels: ChannelWithFollow[]; activeSlug?: string | null; className?: string }) {
  return (
    <nav aria-label="チャンネル" className={cn('-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0', className)}>
      <ul className="flex w-max gap-2 pb-1">
        <li>
          <Chip href="/community" active={!activeSlug} label="すべて" />
        </li>
        {channels.map((c) => (
          <li key={c.id}>
            <Chip href={`/community/${c.slug}`} active={activeSlug === c.slug} label={c.name} followed={c.followed} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Chip({ href, active, label, followed }: { href: string; active: boolean; label: string; followed?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded border px-4 font-sans text-[13px] tracking-[0.06em] no-underline transition-colors',
        active ? 'border-ink-900 bg-ink-900 text-paper-100 hover:text-paper-100' : 'border-stone-300 text-ink-700 hover:border-bronze-500 hover:text-ink-700',
      )}
    >
      {followed && <span aria-hidden title="フォロー中" className="inline-block size-1.5 rounded-full bg-bronze-500" />}
      {label}
    </Link>
  )
}
