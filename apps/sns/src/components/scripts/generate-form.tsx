'use client'

import { useActionState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { generateScriptAction } from '@/features/scripts/actions'
import { Field, Select } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { ACTIVE_CHANNELS, channelDefinition } from '@/lib/config/channels'
import { SCRIPT_STYLES, SCRIPT_TONES } from '@/lib/config/taxonomy'
import { SCRIPT_DURATIONS } from '@/lib/validation/script'
import type { ActionResult } from '@/lib/errors'

/** 台本生成の入力(要件29)。 */
export function ScriptGenerateForm({
  ideaId,
  defaultChannel,
  defaultDuration,
}: {
  ideaId: string
  defaultChannel: string
  defaultDuration: number
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(generateScriptAction, null)
  const durations = channelDefinition(defaultChannel)?.durations ?? [...SCRIPT_DURATIONS]
  const closest = durations.reduce((best, value) =>
    Math.abs(value - defaultDuration) < Math.abs(best - defaultDuration) ? value : best,
  )

  return (
    <>
      {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

      <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <input type="hidden" name="ideaId" value={ideaId} />

        <Field label="SNS" htmlFor="script-channel">
          <Select id="script-channel" name="channel" defaultValue={defaultChannel}>
            {ACTIVE_CHANNELS.map((channel) => (
              <option key={channel.key} value={channel.key}>
                {channel.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="尺" htmlFor="script-duration">
          <Select id="script-duration" name="durationSec" defaultValue={String(closest)}>
            {SCRIPT_DURATIONS.map((duration) => (
              <option key={duration} value={duration}>
                {duration}秒
              </option>
            ))}
          </Select>
        </Field>

        <Field label="出演スタイル" htmlFor="script-style">
          <Select id="script-style" name="style" defaultValue="face_to_camera">
            {SCRIPT_STYLES.map((style) => (
              <option key={style.key} value={style.key}>
                {style.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="トーン" htmlFor="script-tone">
          <Select id="script-tone" name="tone" defaultValue="friendly">
            {SCRIPT_TONES.map((tone) => (
              <option key={tone.key} value={tone.key}>
                {tone.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="sm:col-span-2 lg:col-span-4">
          <SubmitButton variant="gradient" size="lg" className="w-full sm:w-auto">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            台本を作る
          </SubmitButton>
          {pending ? (
            <p className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-brand">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              シーン構成を作成しています…
            </p>
          ) : null}
        </div>
      </form>
    </>
  )
}
