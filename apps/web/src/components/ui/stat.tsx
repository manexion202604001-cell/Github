import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'brand'
  className?: string
}) {
  return (
    <div className={cn('rounded-[18px] border border-line bg-surface px-5 py-4', className)}>
      <p className="text-[12px] font-semibold text-ink-subtle">{label}</p>
      <p className={cn('tabular mt-1.5 text-2xl font-bold', tone === 'brand' ? 'text-brand' : 'text-ink')}>{value}</p>
      {sub ? <p className="mt-1 text-[12px] text-ink-muted">{sub}</p> : null}
    </div>
  )
}

/** 横棒でスコアの内訳を示す。ライブラリを使わず軽量に保つ。 */
export function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-ink-muted">{label}</span>
        <span className="tabular font-bold text-ink">
          {value}
          <span className="text-ink-subtle"> / {max}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={cn('h-full rounded-full', ratio >= 0.7 ? 'bg-brand' : ratio >= 0.4 ? 'bg-brand-soft' : 'bg-line-strong')}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
