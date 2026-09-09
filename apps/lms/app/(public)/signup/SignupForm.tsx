'use client'
import { useActionState } from 'react'
import { acceptInvitation } from '@/lib/actions/auth'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormMessage } from '@/components/ui/FormMessage'

export function SignupForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(acceptInvitation, null)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Field label="メールアドレス" htmlFor="email">
        <Input id="email" value={email} readOnly disabled />
      </Field>
      <Field label="表示名" htmlFor="displayName" hint="コミュニティやランキングに表示されます。">
        <Input id="displayName" name="displayName" required maxLength={40} autoComplete="nickname" />
      </Field>
      <Field label="パスワード" htmlFor="password" hint="8 文字以上">
        <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </Field>
      <FormMessage message={state && !state.ok ? state.error : null} />
      <p className="caption">
        登録により <a href="/terms" target="_blank">利用規約</a> と <a href="/privacy" target="_blank">プライバシーポリシー</a> に同意したものとみなします。
      </p>
      <SubmitButton className="w-full" pendingText="登録中…">登録する</SubmitButton>
    </form>
  )
}
