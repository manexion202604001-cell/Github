import { hasRole, requireRole } from '@/lib/auth'
import { AdminNav } from '@/components/admin/AdminNav'
import { Avatar } from '@/components/ui/Avatar'
import { ROLE_LABEL } from '@/lib/utils'

export const metadata = { robots: { index: false, follow: false }, title: { default: '管理画面', template: '%s | 管理画面' } }

/** 管理画面レイアウト: instructor 以上。admin 限定ページは各 page で requireRole('admin') */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('instructor')
  const isAdmin = hasRole(user.profile, 'admin')
  return (
    <div className="min-h-dvh">
      <AdminNav isAdmin={isAdmin} />
      <div className="flex min-h-dvh flex-col lg:pl-60">
        <header className="hidden h-16 items-center justify-end border-b bg-paper-100 px-8 lg:flex">
          <div className="flex items-center gap-3">
            <span className="font-sans text-[13px] tracking-wide text-ink-700">{user.profile.displayName}</span>
            <span className="caption">{ROLE_LABEL[user.profile.role]}</span>
            <Avatar name={user.profile.displayName} src={user.profile.avatarUrl} size={32} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-container flex-1 px-4 py-8 md:px-8 md:py-12">{children}</main>
      </div>
    </div>
  )
}
