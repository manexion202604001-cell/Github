'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type TabItem = { id: string; label: string; content: ReactNode }

export function Tabs({ items, initialId, className }: { items: TabItem[]; initialId?: string; className?: string }) {
  const [active, setActive] = useState(initialId ?? items[0]?.id ?? '')
  const current = items.find((item) => item.id === active) ?? items[0]

  return (
    <div className={className}>
      <div role="tablist" className="mx-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={item.id === current?.id}
            onClick={() => setActive(item.id)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors',
              item.id === current?.id
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-5">
        {current?.content}
      </div>
    </div>
  )
}
