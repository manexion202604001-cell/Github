'use client'
import { useActionState } from 'react'
import { updatePassword } from '@/lib/actions/auth'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormMessage } from '@/components/ui/FormMessage'

/** パスワード変更（成功時は updatePassword がダッシュボードへリダイレクトする） */
export function PasswordForm() {
  const [state, action] = useActionState(updatePassword, null)
  return (
    <form action={action} className="max-w-[420px] space-y-5">
      <Field label="新しいパスワード" htmlFor="password" hint="8 文字以上">
        <Input id="password" name="password" type="password" minLength={8} maxLength={72} required autoComplete="new-password" />
      </Field>
      <Field label="新しいパスワード（確認）" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" minLength={8} maxLength={72} required autoComplete="new-password" />
      </Field>
      <FormMessage message={state && !state.ok ? state.error : null} />
      <SubmitButton variant="outline" pendingText="更新中…">パスワードを更新</SubmitButton>
    </form>
  )
}
