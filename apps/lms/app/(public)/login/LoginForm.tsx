'use client'
import { useActionState } from 'react'
import { signIn } from '@/lib/actions/auth'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormMessage } from '@/components/ui/FormMessage'

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, null)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="メールアドレス" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="パスワード" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage message={state && !state.ok ? state.error : null} />
      <SubmitButton className="w-full" pendingText="ログイン中…">ログイン</SubmitButton>
    </form>
  )
}
