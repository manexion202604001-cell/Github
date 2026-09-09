import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { UserMenu } from './UserMenu'

export function Header({
  displayName,
  avatarUrl,
  unreadCount,
  isStaff,
}: {
  displayName: string
  avatarUrl: string | null
  unreadCount: number
  isStaff: boolean
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-paper-100/95 px-4 backdrop-blur md:px-8">
      <Link href="/dashboard" className="font-serif text-[16px] tracking-widest text-ink-900 no-underline lg:hidden">
        studio N
      </Link>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <Link href="/notifications" className="relative text-stone-500 no-underline hover:text-bronze-500" aria-label={`通知${unreadCount > 0 ? `（未読 ${unreadCount} 件）` : ''}`}>
          <Bell className="size-5 stroke-[1.5]" />
          {unreadCount > 0 && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-bronze-500" />}
        </Link>
        <UserMenu displayName={displayName} isStaff={isStaff}>
          <Avatar name={displayName} src={avatarUrl} size={32} />
        </UserMenu>
      </div>
    </header>
  )
}
