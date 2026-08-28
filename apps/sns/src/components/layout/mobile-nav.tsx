'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Logo } from './logo'
import { SidebarNav } from './sidebar-nav'
import { BrandSwitcher, type BrandOption } from './brand-switcher'

/** Mobile では Sidebar を Drawer 化する(要件91)。 */
export function MobileNav({ brands, activeBrandId }: { brands: BrandOption[]; activeBrandId: string | null }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-surface text-navy lg:hidden"
        aria-label="メニューを開く"
        aria-expanded={open}
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-navy/35" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="animate-fade-in absolute inset-y-0 left-0 flex w-[85vw] max-w-[280px] flex-col border-r border-line bg-surface"
            role="dialog"
            aria-modal="true"
            aria-label="ナビゲーション"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-ink-subtle hover:bg-canvas-alt hover:text-ink"
                aria-label="メニューを閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-line px-4 py-3">
              <BrandSwitcher brands={brands} activeBrandId={activeBrandId} />
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
