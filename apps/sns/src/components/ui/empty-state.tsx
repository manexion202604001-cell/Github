import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * データが無い画面を空白にしない(要件89)。
 * 何が無いのか・次に何をすればよいかを必ず示す。
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[18px] border border-dashed border-line-strong bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <span className="dot-pattern flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-brand-wash text-brand">
        {icon}
      </span>
      <h3 className="mt-5 text-[15px] font-bold text-navy">{title}</h3>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
