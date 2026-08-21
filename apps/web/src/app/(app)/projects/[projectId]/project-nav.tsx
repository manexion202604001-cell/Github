'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

/** プロジェクト左メニュー(要件77)。 */
const MENU: { segment: string; label: string }[] = [
  { segment: '', label: 'ダッシュボード' },
  { segment: 'overview', label: '商品概要' },
  { segment: 'images', label: '商品画像' },
  { segment: 'market', label: '市場分析' },
  { segment: 'competitors', label: '競合分析' },
  { segment: 'score', label: '商品評価' },
  { segment: 'cost', label: '利益シミュレーション' },
  { segment: 'spec', label: '商品仕様' },
  { segment: 'oem', label: 'OEM' },
  { segment: 'sample', label: 'サンプル' },
  { segment: 'lp', label: 'LP' },
  { segment: 'video', label: 'PR動画' },
  { segment: 'launch', label: '販売準備' },
  { segment: 'sales', label: '販売分析' },
  { segment: 'improvement', label: '改善' },
]

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <nav className="lg:sticky lg:top-20 lg:self-start">
      <ul className="mx-scrollbar flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {MENU.map((item) => {
          const href = item.segment ? `${base}/${item.segment}` : base
          const active = item.segment ? pathname.startsWith(href) : pathname === base
          return (
            <li key={item.segment} className="shrink-0">
              <Link
                href={href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors',
                  active ? 'bg-brand-wash text-brand' : 'text-ink-muted hover:bg-canvas-alt hover:text-ink',
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
