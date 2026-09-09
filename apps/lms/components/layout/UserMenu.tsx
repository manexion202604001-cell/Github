'use client'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { signOut } from '@/lib/actions/auth'

const itemClass =
  'flex h-10 cursor-pointer items-center px-4 font-sans text-[13px] tracking-[0.04em] text-ink-700 no-underline outline-none hover:bg-paper-200 hover:text-ink-700 data-[highlighted]:bg-paper-200'

export function UserMenu({ displayName, isStaff, children }: { displayName: string; isStaff: boolean; children: React.ReactNode }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="rounded-full" aria-label={`${displayName} のメニュー`}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-40 w-52 animate-fade-up rounded border bg-paper-100 py-2">
          <div className="px-4 pb-2 pt-1 font-serif text-[14px] text-ink-900">{displayName}</div>
          <DropdownMenu.Separator className="my-1 h-px bg-stone-300/60" />
          <DropdownMenu.Item asChild><Link href="/settings/profile" className={itemClass}>プロフィール</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/badges" className={itemClass}>バッジ</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/certificates" className={itemClass}>修了証</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/settings/notifications" className={itemClass}>通知設定</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/settings/account" className={itemClass}>アカウント</Link></DropdownMenu.Item>
          {isStaff && <DropdownMenu.Item asChild><Link href="/admin" className={itemClass}>管理画面</Link></DropdownMenu.Item>}
          <DropdownMenu.Separator className="my-1 h-px bg-stone-300/60" />
          <DropdownMenu.Item asChild>
            <button type="button" className={`${itemClass} w-full`} onClick={() => signOut()}>ログアウト</button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
