import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Card の見た目は情報量で使い分ける(要件78)。
 * plain: 通常 / raised: 主役 / outline: 補助 / flat: 一覧の密度重視
 */
type Tone = 'plain' | 'raised' | 'outline' | 'flat'

const TONES: Record<Tone, string> = {
  plain: 'bg-surface border border-line shadow-[0_8px_30px_rgba(15,39,80,0.06)]',
  raised: 'bg-surface border border-line shadow-[0_16px_44px_rgba(15,39,80,0.1)]',
  outline: 'bg-transparent border border-line',
  flat: 'bg-surface border border-line',
}

export function Card({
  className,
  tone = 'plain',
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  // min-w-0: Card は flex / grid の子になることが多く、既定の min-width:auto のままだと
  // 中身の固有幅でトラックが広がり、狭い画面でページ全体が横スクロールする。
  return <div className={cn('min-w-0 rounded-[18px]', TONES[tone], className)} {...props} />
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6 sm:py-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-wash text-brand">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-navy">{title}</h2>
          {description ? <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="min-w-0 max-w-full">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 sm:px-6 sm:py-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-line px-5 py-4 sm:px-6', className)} {...props} />
}

/** セクションの見出し。カードの外で使う。 */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-[-0.02em] text-navy">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="min-w-0 max-w-full">{action}</div> : null}
    </div>
  )
}
