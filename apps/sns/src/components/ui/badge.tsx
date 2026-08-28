import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'brand' | 'cyan' | 'positive' | 'warning' | 'danger' | 'insight' | 'navy' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-canvas-alt text-ink-muted border-line',
  brand: 'bg-brand-wash text-brand border-brand/15',
  cyan: 'bg-cyan-wash text-[#0a7ea8] border-cyan/25',
  positive: 'bg-positive-wash text-positive border-positive/20',
  warning: 'bg-warning-wash text-[#9a6511] border-warning/25',
  danger: 'bg-danger-wash text-danger border-danger/20',
  insight: 'bg-insight-wash text-insight border-insight/20',
  navy: 'bg-navy text-white border-navy',
  accent: 'bg-accent/25 text-[#7a5a00] border-accent/50',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}

export type BadgeTone = Tone
