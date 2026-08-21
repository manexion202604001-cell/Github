import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { Logo } from '@/components/layout/logo'
import { LogoutButton } from '@/components/layout/logout-button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-[13px] font-semibold text-ink-muted transition-colors hover:text-brand"
            >
              設定
            </Link>
            <span className="hidden text-[13px] text-ink-muted sm:inline">{user.name ?? user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
    </div>
  )
}
