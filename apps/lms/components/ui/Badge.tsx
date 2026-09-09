import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: 'tag' | 'official' | 'status' | 'muted' }

export function Badge({ className, variant = 'tag', ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-sans text-[11px] leading-[1.5] tracking-wider',
        variant === 'tag' && 'border border-stone-400 text-stone-500',
        variant === 'official' && 'bg-bronze-500 text-ink-900',
        variant === 'status' && 'border border-bronze-500 text-bronze-500',
        variant === 'muted' && 'bg-paper-200 text-stone-500',
        className,
      )}
      {...props}
    />
  )
}

export function Dot({ className }: { className?: string }) {
  return <span aria-hidden className={cn('inline-block size-1.5 rounded-full bg-bronze-500', className)} />
}
