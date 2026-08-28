'use client'

import { useActionState, useEffect } from 'react'
import { updateOrganizationAction } from '@/features/organizations/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Select } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { roleAtLeast, type Role } from '@/features/organizations/domain'
import type { ActionResult } from '@/lib/errors'

/** 組織ごとのAI Provider選択(要件49)。キー自体は環境変数でサーバーに保持する。 */
export function AiProviderForm({
  organizationName,
  currentProvider,
  providers,
  role,
}: {
  organizationName: string
  currentProvider: string
  providers: { id: string; configured: boolean }[]
  role: Role
}) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(updateOrganizationAction, null)
  const canEdit = roleAtLeast(role, 'ADMIN')

  useEffect(() => {
    if (state?.ok) toast.success('AI設定を保存しました。')
  }, [state, toast])

  return (
    <Card>
      <CardHeader title="AI Provider" description="この組織の生成処理で使うProviderを選びます。" />
      <CardBody>
        {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="space-y-4">
          {/* 組織名はこのフォームでは変更しないが、更新アクションの必須項目のため同送する。 */}
          <input type="hidden" name="name" value={organizationName} />

          <Field
            label="使用するProvider"
            htmlFor="aiProvider"
            hint="「環境変数に従う」を選ぶと、AI_PROVIDER の設定が使われます。"
          >
            <Select id="aiProvider" name="aiProvider" defaultValue={currentProvider} disabled={!canEdit}>
              <option value="">環境変数に従う</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.id}
                  {provider.configured ? '' : '(APIキー未設定)'}
                </option>
              ))}
            </Select>
          </Field>

          {canEdit ? (
            <div className="flex justify-end border-t border-line pt-4">
              <SubmitButton>保存する</SubmitButton>
            </div>
          ) : (
            <p className="border-t border-line pt-4 text-[12px] text-ink-muted">
              AI設定の変更には Admin 以上の権限が必要です。
            </p>
          )}
        </form>
      </CardBody>
    </Card>
  )
}
