import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'

/** KPIカード(要件12)。値の変化が分かる場合のみ差分を出す。 */
export function StatCard({
  label,
  value,
  unit,
  delta,
  icon,
  href,
  className,
}: {
  label: string
  value: number | string
  unit?: string
  delta?: number | null
  icon: ReactNode
  href?: string
  className?: string
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] font-semibold tracking-wide text-ink-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-wash text-brand">{icon}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="tabular text-[30px] font-bold leading-none text-navy">{value}</span>
        {unit ? <span className="text-[13px] font-medium text-ink-muted">{unit}</span> : null}
      </div>
      {delta !== undefined && delta !== null ? (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-[12px] font-semibold',
            delta >= 0 ? 'text-positive' : 'text-danger',
          )}
        >
          {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta >= 0 ? '+' : ''}
          {delta} <span className="font-medium text-ink-subtle">今月</span>
        </p>
      ) : null}
    </>
  )

  const className_ = cn(
    'block rounded-[18px] border border-line bg-surface px-5 py-4 shadow-[0_8px_30px_rgba(15,39,80,0.06)] transition-[border-color,box-shadow] duration-200',
    href && 'hover:border-brand/35 hover:shadow-[0_16px_44px_rgba(15,39,80,0.1)]',
    className,
  )

  if (href) {
    return (
      <a href={href} className={className_}>
        {content}
      </a>
    )
  }
  return <div className={className_}>{content}</div>
}
