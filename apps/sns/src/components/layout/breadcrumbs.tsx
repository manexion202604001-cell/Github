import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

/** メイン画面のBreadcrumb(要件77)。 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null
  return (
    <nav aria-label="パンくずリスト" className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
          {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-ink-subtle" aria-hidden="true" /> : null}
          {item.href && index < items.length - 1 ? (
            <Link href={item.href} className="truncate transition-colors hover:text-brand">
              {item.label}
            </Link>
          ) : (
            <span className="truncate font-semibold text-navy" aria-current={index === items.length - 1 ? 'page' : undefined}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
