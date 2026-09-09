import { cn } from '@/lib/utils'

export function ProgressBar({
  value,
  label,
  showValue = true,
  className,
}: {
  value: number
  label?: string
  showValue?: boolean
  className?: string
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? '進捗'}
        className="h-[2px] flex-1 overflow-hidden rounded bg-stone-300/30"
      >
        <div className="h-full bg-bronze-500 transition-[width]" style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="caption tnum shrink-0">{v}%</span>}
    </div>
  )
}
