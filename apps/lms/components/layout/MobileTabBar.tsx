'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MOBILE_NAV } from './nav-items'

export function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="dark-surface fixed inset-x-0 bottom-0 z-30 flex h-14 bg-ink-900 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active =
          item.href === '/more'
            ? ['/ranking', '/badges', '/certificates', '/notifications', '/settings', '/office-hours', '/more'].some((p) =>
                pathname.startsWith(p),
              )
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 font-sans text-[10px] tracking-wide text-paper-100/70 no-underline',
              active && 'text-paper-100 after:absolute after:bottom-0 after:h-[2px] after:w-8 after:bg-bronze-500',
            )}
          >
            <item.icon className={cn('size-5 stroke-[1.5]', active ? 'text-bronze-500' : 'text-stone-300')} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
