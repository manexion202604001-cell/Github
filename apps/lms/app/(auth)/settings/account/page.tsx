import { requireUser } from '@/lib/auth'
import { Label } from '@/components/ui/Label'
import { formatDateTime } from '@/lib/utils'
import { PasswordForm } from './PasswordForm'
import { DeletionRequest } from './DeletionRequest'

export const metadata = { title: 'アカウント設定' }

export default async function AccountSettingsPage() {
  const user = await requireUser()
  return (
    <div className="space-y-12">
      <section className="space-y-1">
        <Label>メールアドレス</Label>
        <p className="font-sans text-[14px] tracking-[0.04em] text-ink-700">{user.email}</p>
        <p className="caption">メールアドレスの変更はサポートまでご連絡ください。</p>
      </section>

      <section>
        <p className="eyebrow mb-1">Password</p>
        <h2 className="mb-6 text-[20px] md:text-[22px]">パスワードの変更</h2>
        <PasswordForm />
      </section>

      <section className="border-t pt-12">
        <p className="eyebrow mb-1">Withdrawal</p>
        <h2 className="mb-2 text-[20px] md:text-[22px]">退会</h2>
        <p className="mb-6 max-w-prose text-[15px] leading-[1.9] text-stone-500">
          退会を申請すると管理者が確認のうえ手続きします。手続き後はログインできなくなり、投稿は「退会ユーザー」として匿名化されます。
        </p>
        <DeletionRequest requestedAt={user.profile.deletionRequestedAt ? formatDateTime(user.profile.deletionRequestedAt) : null} />
      </section>
    </div>
  )
}
