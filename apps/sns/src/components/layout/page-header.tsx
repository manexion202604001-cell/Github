import type { ReactNode } from 'react'
import { Breadcrumbs, type Crumb } from './breadcrumbs'
import { cn } from '@/lib/cn'

/** 各画面の共通ヘッダー。Breadcrumb + タイトル + 操作。 */
export function PageHeader({
  crumbs,
  title,
  description,
  action,
  className,
}: {
  crumbs?: Crumb[]
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 ? <Breadcrumbs items={crumbs} /> : null}
        <h1 className="mt-1.5 text-[24px] font-bold tracking-[-0.025em] text-navy sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-muted">{description}</p> : null}
      </div>
      {/* 狭い画面では操作ボタンが折り返せるよう、収縮を止めない(要件91)。 */}
      {action ? <div className="no-print min-w-0 max-w-full">{action}</div> : null}
    </div>
  )
}

/** ページ本体の余白を統一する。 */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8', className)}>{children}</div>
}
