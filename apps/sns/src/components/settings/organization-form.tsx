'use client'

import { useActionState, useEffect } from 'react'
import { updateOrganizationAction } from '@/features/organizations/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { ROLE_DESCRIPTIONS, ROLE_LABELS, roleAtLeast, type Role } from '@/features/organizations/domain'
import type { ActionResult } from '@/lib/errors'

export function OrganizationForm({
  name,
  slug,
  memberCount,
  role,
}: {
  name: string
  slug: string
  memberCount: number
  role: Role
}) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(updateOrganizationAction, null)
  const canEdit = roleAtLeast(role, 'ADMIN')

  useEffect(() => {
    if (state?.ok) toast.success('組織設定を保存しました。')
  }, [state, toast])

  return (
    <Card>
      <CardHeader title="組織" description={`あなたの権限: ${ROLE_LABELS[role]} — ${ROLE_DESCRIPTIONS[role]}`} />
      <CardBody>
        {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="space-y-4">
          <Field label="組織名" htmlFor="org-name" required>
            <Input id="org-name" name="name" defaultValue={name} required disabled={!canEdit} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="識別子" htmlFor="org-slug">
              <Input id="org-slug" defaultValue={slug} disabled />
            </Field>
            <Field label="メンバー数" htmlFor="org-members">
              <Input id="org-members" defaultValue={`${memberCount}名`} disabled />
            </Field>
          </div>

          {canEdit ? (
            <div className="flex justify-end border-t border-line pt-4">
              <SubmitButton>保存する</SubmitButton>
            </div>
          ) : (
            <p className="border-t border-line pt-4 text-[12px] text-ink-muted">
              組織設定の変更には Admin 以上の権限が必要です。
            </p>
          )}
        </form>
      </CardBody>
    </Card>
  )
}
