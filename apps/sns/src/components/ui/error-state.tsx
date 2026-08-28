import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * エラー表示(要件90)。
 * 「何が起きたか」と「次に何をすべきか」を必ず日本語で示し、再試行の導線を置く。
 */
export function ErrorState({
  title,
  hint,
  action,
  className,
}: {
  title: string
  hint?: string | null
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn('rounded-[18px] border border-danger/25 bg-danger-wash px-5 py-4', className)}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-danger">{title}</p>
          {hint ? <p className="mt-1 text-[13px] leading-relaxed text-[#9a3a3e]">{hint}</p> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function InlineNotice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warning' | 'positive'
  title: string
  children?: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-brand/20 bg-brand-wash text-brand',
    warning: 'border-warning/30 bg-warning-wash text-[#9a6511]',
    positive: 'border-positive/20 bg-positive-wash text-positive',
  }
  return (
    <div className={cn('rounded-[14px] border px-4 py-3', tones[tone], className)}>
      <p className="text-[13px] font-bold">{title}</p>
      {children ? <div className="mt-1 text-[13px] leading-relaxed text-ink-muted">{children}</div> : null}
    </div>
  )
}
