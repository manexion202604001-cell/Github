'use client'

import { useActionState, useEffect } from 'react'
import { createBrandAction, updateBrandAction } from '@/features/brands/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { CheckChip, Field, Input, Textarea } from '@/components/ui/field'
import { TagInput } from '@/components/ui/tag-input'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { ACTIVE_CHANNELS } from '@/lib/config/channels'
import { SNS_GOALS } from '@/lib/config/taxonomy'
import type { ActionResult } from '@/lib/errors'

export type BrandFormValues = {
  id: string
  name: string
  industry: string | null
  website: string | null
  region: string | null
  description: string | null
  targetCustomer: string | null
  brandTone: string | null
  snsChannels: string[]
  snsGoals: string[]
  brandKeywords: string[]
  additionalContext: string | null
}

/** ブランドカルテの入力(要件11)。作成と編集で同じ項目を使う。 */
export function BrandForm({ mode, brand }: { mode: 'create' | 'edit'; brand?: BrandFormValues }) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(
    mode === 'create' ? createBrandAction : updateBrandAction,
    null,
  )

  useEffect(() => {
    if (state?.ok) toast.success('ブランド情報を保存しました。')
  }, [state, toast])

  return (
    <form action={action} className="space-y-6">
      {brand ? <input type="hidden" name="brandId" value={brand.id} /> : null}
      {state && !state.ok ? <ErrorState title={state.message} hint={state.hint} /> : null}

      <Card>
        <CardHeader title="企業・ブランド情報" description="AIがこの情報をもとに調査と企画を組み立てます。" />
        <CardBody className="space-y-4">
          <Field label="ブランド名" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={brand?.name ?? ''} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="業種" htmlFor="industry">
              <Input id="industry" name="industry" defaultValue={brand?.industry ?? ''} placeholder="エアコンクリーニング" />
            </Field>
            <Field label="Webサイト" htmlFor="website">
              <Input id="website" name="website" type="url" defaultValue={brand?.website ?? ''} placeholder="https://example.co.jp" />
            </Field>
          </div>
          <Field label="地域" htmlFor="region" hint="市場調査の対象地域の初期値になります。">
            <Input id="region" name="region" defaultValue={brand?.region ?? ''} placeholder="東京都内" />
          </Field>
          <Field label="事業概要" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={brand?.description ?? ''} rows={3} />
          </Field>
          <Field label="ターゲット顧客" htmlFor="targetCustomer">
            <Textarea id="targetCustomer" name="targetCustomer" defaultValue={brand?.targetCustomer ?? ''} rows={3} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="発信の方針" description="トーンとキーワードは、企画と台本の言葉づかいに反映されます。" />
        <CardBody className="space-y-4">
          <Field label="ブランドトーン" htmlFor="brandTone">
            <Input id="brandTone" name="brandTone" defaultValue={brand?.brandTone ?? ''} placeholder="誠実・落ち着いた専門性" />
          </Field>
          <Field label="ブランドキーワード">
            <TagInput name="brandKeywords" defaultValue={brand?.brandKeywords ?? []} placeholder="Enterで追加" />
          </Field>
          <Field label="補足情報" htmlFor="additionalContext" hint="AIへ伝えておきたい前提があれば記入してください。">
            <Textarea id="additionalContext" name="additionalContext" defaultValue={brand?.additionalContext ?? ''} rows={3} />
          </Field>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-navy">運用するSNS</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACTIVE_CHANNELS.map((channel) => (
                <CheckChip
                  key={channel.key}
                  name="snsChannels"
                  value={channel.key}
                  label={channel.label}
                  description={`${channel.aspectRatio} / ${channel.durations[0]}〜${channel.durations[channel.durations.length - 1]}秒`}
                  defaultChecked={brand?.snsChannels.includes(channel.key) ?? channel.key === 'instagram_reels'}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-navy">SNS運用目的</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SNS_GOALS.map((goal) => (
                <CheckChip
                  key={goal.key}
                  name="snsGoals"
                  value={goal.key}
                  label={goal.label}
                  {...(goal.description ? { description: goal.description } : {})}
                  defaultChecked={brand?.snsGoals.includes(goal.key) ?? false}
                />
              ))}
            </div>
          </fieldset>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <SubmitButton size="lg">{mode === 'create' ? 'ブランドを作成' : '変更を保存'}</SubmitButton>
      </div>
    </form>
  )
}
