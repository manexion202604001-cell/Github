import * as React from 'react'
import { cn } from '@/lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement> & { tone?: 'light' | 'dark'; interactive?: boolean }

export function Card({ className, tone = 'light', interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded border p-6 transition-colors md:p-8',
        tone === 'light' ? 'bg-paper-200' : 'dark-surface border-dark bg-ink-800 text-paper-100',
        interactive && 'hover:border-bronze-500',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-serif text-[18px] font-medium leading-[1.6]', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-[14px] leading-[1.8] text-stone-500', className)} {...props} />
}
