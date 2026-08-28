import { cn } from '@/lib/cn'

/** Layout Shift を防ぐため、実データと同じ寸法で置く(要件88)。 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-[10px] bg-[linear-gradient(90deg,#eef3fa_25%,#e2eaf6_50%,#eef3fa_75%)]',
        className,
      )}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[18px] border border-line bg-surface p-5', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-6 w-3/4" />
      <SkeletonText className="mt-4" lines={3} />
    </div>
  )
}
