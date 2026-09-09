'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { approveDeletion, rejectDeletion, updateRole } from '@/lib/actions/admin/members'
import { ROLE_LABEL } from '@/lib/utils'

type Role = 'student' | 'instructor' | 'admin'

/** AUTH-05: ロール変更（即時保存） */
export function RoleSelect({ userId, role, isSelf }: { userId: string; role: Role; isSelf: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Select
      aria-label="ロール"
      value={role}
      disabled={pending || isSelf}
      className="h-9 w-32 text-[13px]"
      onChange={(e) => {
        const next = e.target.value as Role
        start(async () => {
          const res = await updateRole(userId, next)
          toast(res.ok ? 'ロールを変更しました。' : res.error)
          router.refresh()
        })
      }}
    >
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
      ))}
    </Select>
  )
}

/** AUTH-06: 退会申請の承認 / 却下 */
export function DeletionActions({ userId, displayName }: { userId: string; displayName: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div className="flex gap-2">
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm(`${displayName} さんの退会を承認します。プロフィールは匿名化され、ログインできなくなります。よろしいですか？`)) return
          start(async () => {
            const res = await approveDeletion(userId)
            toast(res.ok ? '退会を承認しました。' : res.error)
            router.refresh()
          })
        }}
      >
        承認
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await rejectDeletion(userId)
            toast(res.ok ? '退会申請を却下しました。' : res.error)
            router.refresh()
          })
        }
      >
        却下
      </Button>
    </div>
  )
}
