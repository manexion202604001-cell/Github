'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAIN_NAV } from './nav-items'

export function Sidebar({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname()
  return (
    <aside className="dark-surface fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink-900 text-paper-100 lg:flex">
      <Link href="/dashboard" className="flex h-16 items-center px-6 font-serif text-[18px] tracking-widest text-paper-100 no-underline hover:text-paper-100">
        studio N
      </Link>
      <nav className="mt-4 flex flex-1 flex-col gap-1" aria-label="メイン">
        {MAIN_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center gap-3 px-6 font-sans text-[14px] tracking-[0.06em] text-paper-100/70 no-underline transition-colors hover:text-paper-100',
                active && 'text-paper-100 before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:bg-bronze-500',
              )}
            >
              <item.icon className={cn('size-4 stroke-[1.5]', active ? 'text-bronze-500' : 'text-stone-300')} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      {isStaff && (
        <Link
          href="/admin"
          className="flex h-12 items-center gap-3 border-t border-dark px-6 font-sans text-[13px] tracking-[0.06em] text-paper-100/70 no-underline hover:text-paper-100"
        >
          <ShieldCheck className="size-4 stroke-[1.5] text-stone-300" />
          管理画面
        </Link>
      )}
    </aside>
  )
}
