'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Award,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  MessageCircleQuestion,
  ScrollText,
  Users,
  UsersRound,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }

const ITEMS: Item[] = [
  { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'コース', icon: BookOpen },
  { href: '/admin/members', label: '会員', icon: Users, adminOnly: true },
  { href: '/admin/progress', label: '受講状況', icon: ClipboardList },
  { href: '/admin/qa', label: 'Q&A', icon: MessageCircleQuestion },
  { href: '/admin/community', label: 'コミュニティ', icon: UsersRound },
  { href: '/admin/office-hours', label: 'オフィスアワー', icon: Video },
  { href: '/admin/badges', label: 'バッジ・XP', icon: Award, adminOnly: true },
  { href: '/admin/announcements', label: 'お知らせ', icon: Megaphone, adminOnly: true },
  { href: '/admin/audit', label: '監査ログ', icon: ScrollText, adminOnly: true },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** 管理画面ナビ: PC は左サイドバー（240px, ink-900）、モバイルは上部の横スクロールタブ */
export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin)
  return (
    <>
      <aside className="dark-surface fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink-900 text-paper-100 lg:flex">
        <Link href="/admin" className="flex h-16 items-center gap-3 px-6 font-serif text-[18px] tracking-widest text-paper-100 no-underline hover:text-paper-100">
          studio N
          <span className="caption tracking-widest text-stone-400">ADMIN</span>
        </Link>
        <nav className="mt-4 flex flex-1 flex-col gap-1" aria-label="管理メニュー">
          {items.map((item) => {
            const active = isActive(pathname, item.href)
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
        <Link
          href="/dashboard"
          className="flex h-12 items-center gap-3 border-t border-dark px-6 font-sans text-[13px] tracking-[0.06em] text-paper-100/70 no-underline hover:text-paper-100"
        >
          <ArrowLeft className="size-4 stroke-[1.5] text-stone-300" />
          会員画面へ戻る
        </Link>
      </aside>

      <nav aria-label="管理メニュー" className="dark-surface sticky top-0 z-30 flex h-12 items-stretch overflow-x-auto bg-ink-900 text-paper-100 lg:hidden">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-1 border-r border-dark px-4 font-sans text-[12px] text-paper-100/70 no-underline hover:text-paper-100" aria-label="会員画面へ戻る">
          <ArrowLeft className="size-4 stroke-[1.5]" />
        </Link>
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex shrink-0 items-center px-4 font-sans text-[12px] tracking-wide text-paper-100/70 no-underline whitespace-nowrap',
                active && 'text-paper-100 after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:bg-bronze-500',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
