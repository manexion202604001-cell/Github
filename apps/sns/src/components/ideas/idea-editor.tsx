'use client'

import { useActionState, useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { updateIdeaAction } from '@/features/ideas/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { ACTIVE_CHANNELS } from '@/lib/config/channels'
import { DIFFICULTIES, IDEA_CATEGORIES } from '@/lib/config/taxonomy'
import type { ActionResult } from '@/lib/errors'

type EditableIdea = {
  id: string
  title: string
  category: string
  channel: string
  hook: string
  summary: string
  whyThisIdea: string
  target: string | null
  cta: string | null
  durationSec: number
  difficulty: string
}

/** 企画の編集(要件27)。既定は閉じておき、必要なときだけ開く。 */
export function IdeaEditor({ idea }: { idea: EditableIdea }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState<ActionResult | null, FormData>(updateIdeaAction, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success('企画を保存しました。')
      setOpen(false)
    }
  }, [state, toast])

  if (!open) {
    return (
      <Card tone="outline">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-ink-muted">内容を手直ししたい場合は、企画を直接編集できます。</p>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            企画を編集
          </Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title="企画を編集" description="保存すると、この企画から作る台本にも反映されます。" />
      <CardBody>
        {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="space-y-4">
          <input type="hidden" name="ideaId" value={idea.id} />

          <Field label="タイトル" htmlFor="title" required>
            <Input id="title" name="title" defaultValue={idea.title} required />
          </Field>

          <Field label="Hook" htmlFor="hook" required>
            <Input id="hook" name="hook" defaultValue={idea.hook} required />
          </Field>

          <Field label="企画概要" htmlFor="summary" required>
            <Textarea id="summary" name="summary" defaultValue={idea.summary} required rows={3} />
          </Field>

          <Field label="なぜこの企画なのか" htmlFor="whyThisIdea" required>
            <Textarea id="whyThisIdea" name="whyThisIdea" defaultValue={idea.whyThisIdea} required rows={3} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="カテゴリー" htmlFor="category">
              <Select id="category" name="category" defaultValue={idea.category}>
                {IDEA_CATEGORIES.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="SNS" htmlFor="channel">
              <Select id="channel" name="channel" defaultValue={idea.channel}>
                {ACTIVE_CHANNELS.map((channel) => (
                  <option key={channel.key} value={channel.key}>
                    {channel.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="想定尺(秒)" htmlFor="durationSec">
              <Input id="durationSec" name="durationSec" type="number" min={5} max={600} defaultValue={idea.durationSec} />
            </Field>
            <Field label="制作難易度" htmlFor="difficulty">
              <Select id="difficulty" name="difficulty" defaultValue={idea.difficulty}>
                {DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty.key} value={difficulty.key}>
                    {difficulty.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ターゲット" htmlFor="target">
              <Input id="target" name="target" defaultValue={idea.target ?? ''} />
            </Field>
            <Field label="CTA" htmlFor="cta">
              <Input id="cta" name="cta" defaultValue={idea.cta ?? ''} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <SubmitButton>保存する</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
