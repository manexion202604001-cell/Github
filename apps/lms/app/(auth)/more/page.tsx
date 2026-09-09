import Link from 'next/link'
import { Video, Trophy, Award, FileBadge, Bell, User, Settings, ShieldCheck, ChevronRight } from 'lucide-react'
import { requireUser, isStaff } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { signOut } from '@/lib/actions/auth'

export default async function MorePage() {
  const user = await requireUser()
  const items = [
    { href: '/office-hours', label: 'オフィスアワー', icon: Video },
    { href: '/ranking', label: 'ランキング', icon: Trophy },
    { href: '/badges', label: 'バッジ', icon: Award },
    { href: '/certificates', label: '修了証', icon: FileBadge },
    { href: '/notifications', label: '通知', icon: Bell },
    { href: '/settings/profile', label: 'プロフィール', icon: User },
    { href: '/settings/notifications', label: '通知設定', icon: Settings },
    { href: '/settings/account', label: 'アカウント', icon: Settings },
    ...(isStaff(user.profile) ? [{ href: '/admin', label: '管理画面', icon: ShieldCheck }] : []),
  ]
  return (
    <div>
      <PageHeader eyebrow="More" title="その他" />
      <ul className="divide-y border-y">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="flex h-14 items-center gap-4 font-sans text-[14px] tracking-[0.06em] no-underline">
              <it.icon className="size-4 stroke-[1.5] text-stone-500" />
              <span className="flex-1">{it.label}</span>
              <ChevronRight className="size-4 stroke-[1.5] text-stone-300" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={signOut} className="mt-8">
        <button type="submit" className="ui-label text-stone-500 hover:text-bronze-500">ログアウト</button>
      </form>
    </div>
  )
}
