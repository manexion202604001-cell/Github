import { cn } from '@/lib/cn'

/**
 * AI推定スコアの表示(要件26, 83)。
 * 断定を避けるため「AI推定評価」のラベルを必ず併記する(要件25)。
 */
export function ScoreGauge({
  value,
  size = 'md',
  label = 'AI推定スコア',
  className,
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  const dimensions = { sm: 56, md: 104, lg: 148 }[size]
  const stroke = { sm: 5, md: 9, lg: 12 }[size]
  const radius = (dimensions - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - safe / 100)
  const gradientId = `score-gradient-${size}`

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg
          width={dimensions}
          height={dimensions}
          viewBox={`0 0 ${dimensions} ${dimensions}`}
          role="img"
          aria-label={`${label} ${safe}点(100点満点)`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#135dff" />
              <stop offset="55%" stopColor="#248cff" />
              <stop offset="100%" stopColor="#39c6ff" />
            </linearGradient>
          </defs>
          <circle cx={dimensions / 2} cy={dimensions / 2} r={radius} fill="none" stroke="#e4ecf7" strokeWidth={stroke} />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${dimensions / 2} ${dimensions / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'tabular leading-none text-navy',
              size === 'sm' && 'text-[15px]',
              size === 'md' && 'text-[28px]',
              size === 'lg' && 'text-[40px] font-bold',
            )}
          >
            {safe}
          </span>
          {size !== 'sm' ? <span className="mt-1 text-[10px] font-semibold tracking-wide text-ink-subtle">/ 100</span> : null}
        </div>
      </div>
      {size !== 'sm' ? <p className="mt-2 text-[11px] font-semibold tracking-wide text-ink-subtle">{label}</p> : null}
    </div>
  )
}

/** 評価軸ごとのバー。数値の比較を優先し、装飾は最小限に。 */
export function ScoreBar({ label, value }: { label: string; value: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-ink-muted">{label}</span>
        <span className="tabular text-[13px] text-navy">{safe}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas-alt">
        <div
          className="gradient-brand h-full rounded-full transition-[width] duration-500"
          style={{ width: `${safe}%` }}
          role="meter"
          aria-valuenow={safe}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  )
}
