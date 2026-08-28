'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { generateIdeasAction } from '@/features/ideas/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Select } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { ACTIVE_CHANNELS } from '@/lib/config/channels'
import { IDEA_COUNTS } from '@/lib/validation/idea'
import type { ActionResult } from '@/lib/errors'
import type { GenerateIdeasResult } from '@/features/ideas/service'

/** 企画生成(要件22)。生成中はボタンが無効化され、連打できない。 */
export function IdeaGeneratePanel({
  brandId,
  defaultChannel,
  researches,
  defaultResearchId,
}: {
  brandId: string
  defaultChannel: string
  researches: { id: string; title: string }[]
  defaultResearchId: string | null
}) {
  const router = useRouter()
  const toast = useToast()
  const [state, action, pending] = useActionState<ActionResult<GenerateIdeasResult> | null, FormData>(
    generateIdeasAction,
    null,
  )

  useEffect(() => {
    if (state?.ok) {
      toast.ai(`企画を${state.data.created}件作成しました。`, 'AI推定スコアも同時に付与しています。')
      router.refresh()
    }
  }, [state, toast, router])

  return (
    <Card tone="raised">
      <CardHeader
        icon={<Sparkles className="h-4 w-4" />}
        title="調査から企画を生成する"
        description="市場調査のインサイトを根拠に、それぞれ異なる角度の企画を作ります。"
      />
      <CardBody>
        {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="grid gap-4 sm:grid-cols-[1.4fr_1fr_0.8fr_auto] sm:items-end">
          <input type="hidden" name="brandId" value={brandId} />

          <Field label="根拠にする調査" htmlFor="researchId" hint="未選択でもブランド情報から生成できます。">
            <Select id="researchId" name="researchId" defaultValue={defaultResearchId ?? ''}>
              <option value="">選択しない</option>
              {researches.map((research) => (
                <option key={research.id} value={research.id}>
                  {research.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="SNS" htmlFor="channel">
            <Select id="channel" name="channel" defaultValue={defaultChannel}>
              {ACTIVE_CHANNELS.map((channel) => (
                <option key={channel.key} value={channel.key}>
                  {channel.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="生成数" htmlFor="count">
            <Select id="count" name="count" defaultValue="20">
              {IDEA_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}件{count === 20 ? '(推奨)' : ''}
                </option>
              ))}
            </Select>
          </Field>

          <SubmitButton variant="gradient" size="lg" className="sm:mb-0">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            企画を生成
          </SubmitButton>
        </form>

        {pending ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-[12px] bg-brand-wash px-4 py-2.5 text-[13px] font-semibold text-brand">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            企画を生成し、AI推定スコアを付けています。1〜2分ほどかかります。
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}
