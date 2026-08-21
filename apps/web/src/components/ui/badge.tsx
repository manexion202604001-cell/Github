import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'brand' | 'positive' | 'caution' | 'critical'

const TONES: Record<Tone, string> = {
  neutral: 'bg-canvas-alt text-ink-muted border-line',
  brand: 'bg-brand-wash text-brand border-brand/20',
  positive: 'bg-positive-wash text-positive border-positive/20',
  caution: 'bg-caution-wash text-caution border-caution/20',
  critical: 'bg-critical-wash text-critical border-critical/20',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Providerがmockのときに、実データでないことを必ず明示する(要件121)。 */
export function SampleDataBadge({ label = 'サンプルデータ' }: { label?: string }) {
  return <Badge tone="caution">{label}</Badge>
}
