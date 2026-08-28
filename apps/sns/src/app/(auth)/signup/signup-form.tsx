'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signupAction } from '@/features/auth/actions'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import type { ActionResult } from '@/lib/errors'

export function SignupForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(signupAction, null)

  return (
    <Card tone="raised">
      <CardBody className="sm:px-7 sm:py-7">
        <h1 className="text-xl font-bold tracking-[-0.02em] text-navy">新規登録</h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">組織を作成して、最初のブランドを登録します。</p>

        {state && !state.ok ? <ErrorState className="mt-5" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="mt-6 space-y-4">
          <Field label="お名前" htmlFor="name" required>
            <Input id="name" name="name" autoComplete="name" required placeholder="山田 太郎" />
          </Field>
          <Field label="組織名" htmlFor="organizationName" required hint="会社名・チーム名。あとから変更できます。">
            <Input id="organizationName" name="organizationName" autoComplete="organization" required placeholder="株式会社サンプル" />
          </Field>
          <Field label="メールアドレス" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.co.jp" />
          </Field>
          <Field label="パスワード" htmlFor="password" required hint="10文字以上・英字と数字を含めてください。">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
          </Field>
          <SubmitButton className="w-full" size="lg">
            アカウントを作成
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-muted">
          すでにアカウントをお持ちの場合は{' '}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            ログイン
          </Link>
        </p>
      </CardBody>
    </Card>
  )
}
