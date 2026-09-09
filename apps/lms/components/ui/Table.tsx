import * as React from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse font-sans text-[13px] tracking-[0.04em]', className)} {...props} />
    </div>
  )
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('border-b px-3 py-2 text-left font-normal text-[11px] uppercase tracking-widest text-stone-400', className)}
      {...props}
    />
  )
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b px-3 py-3 align-top text-ink-700', className)} {...props} />
}
