import { cn } from '@/lib/cn'

/** プロダクトマーク。方位磁針=「発信の方向を決める」を意味する(要件79)。 */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="gradient-brand flex h-8 w-8 items-center justify-center rounded-[10px] shadow-[0_6px_16px_rgba(19,93,255,0.3)]">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.6" opacity="0.55" />
          <path d="M13.4 6.6L11.3 11.3L6.6 13.4L8.7 8.7L13.4 6.6Z" fill="white" />
        </svg>
      </span>
      {showText ? (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-[-0.02em] text-navy">SNS COMPASS</span>
          <span className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-ink-subtle">STRATEGY WORKSPACE</span>
        </span>
      ) : null}
    </span>
  )
}
