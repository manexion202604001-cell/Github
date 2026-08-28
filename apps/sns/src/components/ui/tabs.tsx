'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/cn'

export type TabItem = { key: string; label: string; count?: number }

/** URLクエリで状態を持つタブ。リロードしても表示が戻らない。 */
export function QueryTabs({
  param,
  items,
  activeKey,
  className,
}: {
  param: string
  items: TabItem[]
  activeKey: string
  className?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(key: string): string {
    const params = new URLSearchParams(searchParams.toString())
    params.set(param, key)
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className={cn('scroll-x -mx-1 flex gap-1 px-1', className)} role="tablist">
      {items.map((item) => {
        const active = item.key === activeKey
        return (
          <Link
            key={item.key}
            href={hrefFor(item.key)}
            role="tab"
            aria-selected={active}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition-colors',
              active ? 'bg-brand-wash text-brand' : 'text-ink-muted hover:bg-canvas-alt hover:text-navy',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className={cn('tabular text-[11px]', active ? 'text-brand' : 'text-ink-subtle')}>{item.count}</span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
