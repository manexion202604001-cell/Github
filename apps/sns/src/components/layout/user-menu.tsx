'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { logoutAction } from '@/features/auth/actions'

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const initial = (name || email).trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white transition-transform hover:scale-105"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="アカウントメニュー"
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 top-11 z-40 w-60 overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_16px_44px_rgba(15,39,80,0.14)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[13px] font-bold text-navy">{name || 'ユーザー'}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">{email}</p>
            <p className="mt-1.5 inline-flex rounded-full bg-brand-wash px-2 py-0.5 text-[11px] font-semibold text-brand">{role}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/settings/profile"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" /> プロフィール
            </Link>
            <Link
              href="/settings/organization"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy"
            >
              <Settings className="h-4 w-4" aria-hidden="true" /> 組織設定
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger-wash"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> ログアウト
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
