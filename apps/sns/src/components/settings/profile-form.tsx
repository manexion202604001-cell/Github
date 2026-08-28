'use client'

import { useActionState, useEffect } from 'react'
import { updateProfileAction } from '@/features/organizations/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import type { ActionResult } from '@/lib/errors'

export function ProfileForm({ name, email, jobTitle }: { name: string; email: string; jobTitle: string }) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(updateProfileAction, null)

  useEffect(() => {
    if (state?.ok) toast.success('プロフィールを保存しました。')
  }, [state, toast])

  return (
    <Card>
      <CardHeader title="プロフィール" description="表示名は、投稿予定の担当者などに表示されます。" />
      <CardBody>
        {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="space-y-4">
          <Field label="お名前" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={name} required />
          </Field>
          <Field label="役職・肩書き" htmlFor="jobTitle">
            <Input id="jobTitle" name="jobTitle" defaultValue={jobTitle} placeholder="マーケティング担当" />
          </Field>
          <Field label="メールアドレス" htmlFor="email" hint="メールアドレスの変更は現在サポートしていません。">
            <Input id="email" defaultValue={email} disabled />
          </Field>
          <div className="flex justify-end border-t border-line pt-4">
            <SubmitButton>保存する</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
