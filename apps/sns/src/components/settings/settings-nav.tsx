'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const ITEMS = [
  { href: '/settings/profile', label: 'プロフィール' },
  { href: '/settings/organization', label: '組織' },
  { href: '/settings/team', label: 'メンバー' },
  { href: '/settings/brand', label: 'ブランドルール' },
  { href: '/settings/ai', label: 'AI・検索' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    // grid item は既定で min-width:auto のため、min-w-0 を付けないと
    // 内側の横スクロールが効かずページ全体が横に伸びる。
    <nav className="min-w-0" aria-label="設定メニュー">
      <ul className="scroll-x flex gap-1 lg:flex-col lg:gap-0.5">
        {ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors',
                  active ? 'bg-brand-wash text-navy' : 'text-ink-muted hover:bg-canvas-alt hover:text-navy',
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
