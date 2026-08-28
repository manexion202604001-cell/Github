'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from './nav-items'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-0.5" aria-label="メインナビゲーション">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href.split('/').slice(0, 2).join('/'))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold transition-colors',
              active ? 'bg-brand-wash text-navy' : 'text-ink-muted hover:bg-canvas-alt hover:text-navy',
            )}
          >
            <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-brand' : 'text-ink-subtle')} aria-hidden="true" />
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
