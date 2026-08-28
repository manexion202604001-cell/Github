'use client'

import { useActionState, useEffect, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { refineScriptAction } from '@/features/scripts/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { SCRIPT_DURATIONS } from '@/lib/validation/script'
import type { ActionResult } from '@/lib/errors'

/** よく使う修正指示(要件33)。ワンクリックで送れるようにする。 */
const QUICK_INSTRUCTIONS = [
  'もっと短く',
  'もっと専門的に',
  '親しみやすく',
  'フックを強く',
  '営業感を弱く',
  'テロップを短く',
]

const CHIP =
  'rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:border-brand/40 hover:bg-brand-wash hover:text-brand disabled:opacity-50'

export function ScriptQuickActions({ scriptId, durationSec }: { scriptId: string; durationSec: number }) {
  const toast = useToast()
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(refineScriptAction, null)
  const [instruction, setInstruction] = useState('')

  useEffect(() => {
    if (state?.ok) {
      toast.ai('台本を修正しました。')
      setInstruction('')
    }
  }, [state, toast])

  return (
    <Card>
      <CardHeader
        icon={<Wand2 className="h-4 w-4" />}
        title="AIで修正する"
        description="指示した観点だけを変更し、それ以外はできる限り元の内容を保ちます。"
      />
      <CardBody className="space-y-4">
        {state && !state.ok ? <ErrorState title={state.message} hint={state.hint} /> : null}

        {/* 観点の修正。指示は submitter の value で送る。 */}
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="scriptId" value={scriptId} />
          {QUICK_INSTRUCTIONS.map((quick) => (
            <button key={quick} type="submit" name="instruction" value={quick} disabled={pending} className={CHIP}>
              {quick}
            </button>
          ))}
        </form>

        {/* 尺の変更。指示と目標秒数の2つを送るため、ボタンごとに独立したフォームにする。 */}
        <div className="flex flex-wrap gap-2">
          {SCRIPT_DURATIONS.filter((duration) => duration !== durationSec).map((duration) => (
            <form key={duration} action={action}>
              <input type="hidden" name="scriptId" value={scriptId} />
              <input type="hidden" name="instruction" value={`${duration}秒に収まるよう構成を調整する`} />
              <input type="hidden" name="targetDurationSec" value={duration} />
              <button type="submit" disabled={pending} className={CHIP}>
                {duration}秒に変更
              </button>
            </form>
          ))}
        </div>

        <form action={action}>
          <input type="hidden" name="scriptId" value={scriptId} />
          <Field label="自由に指示する" htmlFor="instruction" hint="例: 冒頭で価格に触れず、作業の中身から始めてほしい">
            <div className="flex gap-2">
              <Input
                id="instruction"
                name="instruction"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="修正したい内容を入力"
                maxLength={400}
              />
              <SubmitButton className="shrink-0" disabled={instruction.trim().length === 0}>
                修正する
              </SubmitButton>
            </div>
          </Field>
        </form>

        {pending ? <p className="text-[13px] font-semibold text-brand">台本を書き換えています…</p> : null}
      </CardBody>
    </Card>
  )
}
