import { and, count, eq, isNull } from 'drizzle-orm'
import { requireUser, isStaff } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { Header } from '@/components/layout/Header'

export const metadata = { robots: { index: false, follow: false } }

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const [unread] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
  const staff = isStaff(user.profile)
  return (
    <div className="min-h-dvh">
      <Sidebar isStaff={staff} />
      <div className="flex min-h-dvh flex-col pb-14 lg:pb-0 lg:pl-60">
        <Header displayName={user.profile.displayName} avatarUrl={user.profile.avatarUrl} unreadCount={unread?.n ?? 0} isStaff={staff} />
        <main className="mx-auto w-full max-w-container flex-1 px-4 py-8 md:px-8 md:py-12">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  )
}
