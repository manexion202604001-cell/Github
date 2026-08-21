import { cn } from '@/lib/cn'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex h-7 w-7 items-center justify-center bg-brand text-[13px] font-black text-white">
        M
      </span>
      <span className="text-[15px] font-bold tracking-tight text-ink">
        AI商品開発OS
        <span className="ml-2 text-[10px] font-semibold tracking-widest text-ink-subtle">MANEXION</span>
      </span>
    </span>
  )
}
