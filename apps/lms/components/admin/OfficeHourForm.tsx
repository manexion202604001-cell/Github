'use client'
import { useActionState, useEffect } from 'react'
import type { ActionResult } from '@/lib/action-result'
import { Input, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormMessage } from '@/components/ui/FormMessage'
import { toast } from '@/components/ui/Toaster'

export type OfficeHourFormValues = {
  title: string
  theme: string | null
  /** ISO 文字列（UTC） */
  scheduledAt: string | null
  durationMin: number
  joinUrl: string | null
  recordingUrl: string | null
  summaryMd: string | null
}

/** UTC の ISO 文字列 → datetime-local 用の JST 表記（YYYY-MM-DDTHH:mm） */
function toJstInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${jst.getUTCFullYear()}-${p(jst.getUTCMonth() + 1)}-${p(jst.getUTCDate())}T${p(jst.getUTCHours())}:${p(jst.getUTCMinutes())}`
}

/** ADM-08: オフィスアワー作成 / 編集フォーム（日時は JST 入力） */
export function OfficeHourForm({
  action,
  initial,
  submitLabel,
  showArchiveFields = true,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>
  initial?: OfficeHourFormValues
  submitLabel: string
  showArchiveFields?: boolean
}) {
  const [state, formAction] = useActionState(action, null)
  useEffect(() => {
    if (state?.ok) toast('保存しました。')
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <Field label="タイトル" htmlFor="oh-title">
        <Input id="oh-title" name="title" defaultValue={initial?.title ?? ''} maxLength={120} required />
      </Field>
      <Field label="テーマ" htmlFor="oh-theme" hint="今回取り上げる内容を一言で（任意）">
        <Textarea id="oh-theme" name="theme" defaultValue={initial?.theme ?? ''} maxLength={500} className="min-h-[80px]" />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="開催日時（日本時間）" htmlFor="oh-scheduledAt">
          <Input id="oh-scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={toJstInputValue(initial?.scheduledAt ?? null)} required step={300} />
        </Field>
        <Field label="開催時間（分）" htmlFor="oh-duration">
          <Input id="oh-duration" name="durationMin" type="number" min={15} max={480} step={5} defaultValue={initial?.durationMin ?? 60} required className="tnum" />
        </Field>
      </div>
      <Field label="参加リンク" htmlFor="oh-joinUrl" hint="YouTube Live または Zoom の URL（開催前に登録）">
        <Input id="oh-joinUrl" name="joinUrl" type="url" inputMode="url" defaultValue={initial?.joinUrl ?? ''} placeholder="https://" />
      </Field>
      {showArchiveFields && (
        <>
          <Field label="録画 URL" htmlFor="oh-recordingUrl" hint="終了後に YouTube の URL を登録すると、過去回として会員に公開されます">
            <Input id="oh-recordingUrl" name="recordingUrl" type="url" inputMode="url" defaultValue={initial?.recordingUrl ?? ''} placeholder="https://www.youtube.com/watch?v=" />
          </Field>
          <Field label="要約（Markdown）" htmlFor="oh-summaryMd" hint="タイムスタンプ付きで要点をまとめてください（例: `- 03:15 ○○について`）">
            <Textarea id="oh-summaryMd" name="summaryMd" defaultValue={initial?.summaryMd ?? ''} className="min-h-[240px] font-mono text-[13px]" />
          </Field>
        </>
      )}
      <FormMessage message={state && !state.ok ? state.error : null} />
      <div className="flex justify-end">
        <SubmitButton pendingText="保存中…">{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
