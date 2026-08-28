'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction } from '@/features/auth/actions'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import type { ActionResult } from '@/lib/errors'

export function LoginForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(loginAction, null)

  return (
    <Card tone="raised">
      <CardBody className="sm:px-7 sm:py-7">
        <h1 className="text-xl font-bold tracking-[-0.02em] text-navy">ログイン</h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">SNS戦略ワークスペースへサインインします。</p>

        {state && !state.ok ? <ErrorState className="mt-5" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="mt-6 space-y-4">
          <Field label="メールアドレス" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.co.jp" />
          </Field>
          <Field label="パスワード" htmlFor="password" required>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton className="w-full" size="lg">
            ログイン
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-muted">
          アカウントをお持ちでない場合は{' '}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            新規登録
          </Link>
        </p>
      </CardBody>
    </Card>
  )
}
