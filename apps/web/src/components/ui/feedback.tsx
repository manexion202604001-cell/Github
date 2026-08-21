import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center bg-brand-wash text-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-bold text-ink">{title}</p>
      {description ? <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

type NoticeTone = 'info' | 'success' | 'warning' | 'error'

const NOTICE: Record<NoticeTone, string> = {
  info: 'border-line bg-canvas-alt text-ink-muted',
  success: 'border-positive/20 bg-positive-wash text-positive',
  warning: 'border-caution/20 bg-caution-wash text-caution',
  error: 'border-critical/20 bg-critical-wash text-critical',
}

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: NoticeTone
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn(' border px-4 py-3 text-[13px] leading-relaxed', NOTICE[tone], className)}>
      {title ? <p className="font-bold">{title}</p> : null}
      {children ? <div className={cn(title && 'mt-1')}>{children}</div> : null}
    </div>
  )
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden bg-line', className)}>
      <div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-canvas-alt', className)} />
}
