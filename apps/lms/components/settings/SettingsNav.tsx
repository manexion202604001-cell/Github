'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/settings/profile', label: 'プロフィール' },
  { href: '/settings/notifications', label: '通知' },
  { href: '/settings/account', label: 'アカウント' },
] as const

/** 設定ページ共通のサブナビ */
export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="設定" className="mb-8 flex gap-6 border-b">
      {ITEMS.map((it) => {
        const active = pathname === it.href || pathname.startsWith(`${it.href}/`)
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b pb-3 font-sans text-[13px] tracking-[0.06em] no-underline transition-colors',
              active ? 'border-bronze-500 text-ink-900' : 'border-transparent text-stone-500 hover:text-ink-700',
            )}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
