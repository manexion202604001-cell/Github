'use client'
import { useActionState, useEffect, useState } from 'react'
import { requestPasswordReset, updatePassword } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormMessage } from '@/components/ui/FormMessage'

export function ResetForm() {
  const [state, action] = useActionState(requestPasswordReset, null)
  if (state && state.ok) return <p className="font-serif">リセット用のリンクをお送りしました。メールをご確認ください。</p>
  return (
    <form action={action} className="space-y-5">
      <Field label="メールアドレス" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <FormMessage message={state && !state.ok ? state.error : null} />
      <SubmitButton className="w-full">リセットリンクを送る</SubmitButton>
    </form>
  )
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // メールのリンク（#access_token=...）からセッションを確立する
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  return (
    <form action={action} className="space-y-5">
      <Field label="新しいパスワード" htmlFor="password" hint="8 文字以上">
        <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="新しいパスワード（確認）" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
      </Field>
      <FormMessage message={state && !state.ok ? state.error : null} />
      {!ready && <p className="caption">リンクを確認しています…</p>}
      <SubmitButton className="w-full" disabled={!ready}>パスワードを更新</SubmitButton>
    </form>
  )
}
