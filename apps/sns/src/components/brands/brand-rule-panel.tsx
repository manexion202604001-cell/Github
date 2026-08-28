'use client'

import { useActionState, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { saveBrandRulesAction } from '@/features/brands/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { TagInput } from '@/components/ui/tag-input'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import type { ActionResult } from '@/lib/errors'

export type BrandRuleData = {
  prohibitedWords: string[]
  preferredWords: string[]
  tone: string | null
  allowCompetitorNames: boolean
  avoidExpressions: string[]
  legalNotes: string | null
  regulatoryNotes: string | null
  internalRules: string | null
  preferredCta: string | null
  visualPreferences: string | null
} | null

/** Brand Guard の設定(要件45)。台本のチェック基準になる。 */
export function BrandRulePanel({ brandId, rules }: { brandId: string; rules: BrandRuleData }) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(saveBrandRulesAction, null)

  useEffect(() => {
    if (state?.ok) toast.success('ブランドルールを保存しました。')
  }, [state, toast])

  return (
    <Card>
      <CardHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Brand Guard"
        description="ここに登録したルールが、台本のブランドチェックの基準になります。"
      />
      <CardBody>
        {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="space-y-4">
          <input type="hidden" name="brandId" value={brandId} />

          <Field label="禁止ワード" hint="この表現が含まれると警告します。">
            <TagInput name="prohibitedWords" defaultValue={rules?.prohibitedWords ?? []} placeholder="例: 絶対に" />
          </Field>
          <Field label="推奨ワード">
            <TagInput name="preferredWords" defaultValue={rules?.preferredWords ?? []} />
          </Field>
          <Field label="避ける表現">
            <TagInput name="avoidExpressions" defaultValue={rules?.avoidExpressions ?? []} placeholder="例: 煽るような比較" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ブランドトーン" htmlFor="rule-tone">
              <Input id="rule-tone" name="tone" defaultValue={rules?.tone ?? ''} placeholder="誠実・落ち着いた専門性" />
            </Field>
            <Field label="推奨CTA" htmlFor="rule-cta">
              <Input id="rule-cta" name="preferredCta" defaultValue={rules?.preferredCta ?? ''} placeholder="プロフィールから相談できます" />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line px-4 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand-wash">
            <input
              type="checkbox"
              name="allowCompetitorNames"
              defaultChecked={rules?.allowCompetitorNames ?? false}
              className="mt-0.5 h-4 w-4 accent-[#135dff]"
            />
            <span>
              <span className="block text-[13px] font-semibold text-navy">競合名の言及を許可する</span>
              <span className="mt-0.5 block text-[12px] text-ink-muted">
                オフの場合、台本で具体的な競合名に触れないよう指示します。
              </span>
            </span>
          </label>

          <Field label="法務メモ" htmlFor="rule-legal">
            <Textarea id="rule-legal" name="legalNotes" defaultValue={rules?.legalNotes ?? ''} rows={2} />
          </Field>
          <Field label="規制上の注意" htmlFor="rule-regulatory" hint="薬機法・景表法など、表現上の注意事項。">
            <Textarea id="rule-regulatory" name="regulatoryNotes" defaultValue={rules?.regulatoryNotes ?? ''} rows={2} />
          </Field>
          <Field label="社内ルール" htmlFor="rule-internal">
            <Textarea id="rule-internal" name="internalRules" defaultValue={rules?.internalRules ?? ''} rows={2} />
          </Field>
          <Field label="ビジュアルの好み" htmlFor="rule-visual">
            <Textarea id="rule-visual" name="visualPreferences" defaultValue={rules?.visualPreferences ?? ''} rows={2} />
          </Field>

          <div className="flex justify-end border-t border-line pt-4">
            <SubmitButton>ルールを保存</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
