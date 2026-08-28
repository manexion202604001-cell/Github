'use client'

import { useActionState, useEffect, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { createCalendarItemAction } from '@/features/calendar/actions'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { ACTIVE_CHANNELS } from '@/lib/config/channels'
import { CALENDAR_STATUSES } from '@/lib/config/taxonomy'
import type { ActionResult } from '@/lib/errors'

/**
 * 企画・台本からカレンダーへ登録する(要件43)。
 * SNSへの自動投稿は行わない。あくまで社内の投稿予定として記録する。
 */
export function CalendarAddButton({
  brandId,
  ideaId,
  scriptId,
  defaultTitle,
  defaultChannel,
  defaultStatus = 'PLANNED',
}: {
  brandId: string
  ideaId?: string
  scriptId?: string
  defaultTitle: string
  defaultChannel: string
  defaultStatus?: string
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState<ActionResult | null, FormData>(createCalendarItemAction, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success('カレンダーへ追加しました。')
      setOpen(false)
    }
  }, [state, toast])

  // 既定値は翌日の10:00。datetime-local が受け取る形式へ整える。
  const defaultAt = new Date()
  defaultAt.setDate(defaultAt.getDate() + 1)
  defaultAt.setHours(10, 0, 0, 0)
  const defaultValue = `${defaultAt.getFullYear()}-${String(defaultAt.getMonth() + 1).padStart(2, '0')}-${String(defaultAt.getDate()).padStart(2, '0')}T10:00`

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        カレンダーへ追加
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="カレンダーへ追加"
        description="投稿予定として登録します。SNSへの自動投稿は行いません。"
      >
        {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

        <form action={action} className="space-y-4">
          <input type="hidden" name="brandId" value={brandId} />
          {ideaId ? <input type="hidden" name="ideaId" value={ideaId} /> : null}
          {scriptId ? <input type="hidden" name="scriptId" value={scriptId} /> : null}

          <Field label="タイトル" htmlFor="calendar-title" required>
            <Input id="calendar-title" name="title" defaultValue={defaultTitle} required />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="投稿予定日時" htmlFor="calendar-at" required>
              <Input id="calendar-at" name="scheduledAt" type="datetime-local" defaultValue={defaultValue} required />
            </Field>
            <Field label="SNS" htmlFor="calendar-channel">
              <Select id="calendar-channel" name="channel" defaultValue={defaultChannel}>
                {ACTIVE_CHANNELS.map((channel) => (
                  <option key={channel.key} value={channel.key}>
                    {channel.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="ステータス" htmlFor="calendar-status">
            <Select id="calendar-status" name="status" defaultValue={defaultStatus}>
              {CALENDAR_STATUSES.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="メモ" htmlFor="calendar-notes">
            <Textarea id="calendar-notes" name="notes" rows={3} placeholder="撮影日や担当者への引き継ぎなど" />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <SubmitButton>追加する</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  )
}
