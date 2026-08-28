'use server'

import { revalidatePath } from 'next/cache'
import { actionFailure, type ActionResult } from '@/lib/errors'
import { calendarItemSchema } from '@/lib/validation/calendar'
import { toOptionalString } from '@/lib/validation/common'
import { createCalendarItem, deleteCalendarItem, updateCalendarItem } from './service'

export async function createCalendarItemAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const parsed = calendarItemSchema.parse({
      brandId: form.get('brandId'),
      ideaId: toOptionalString(form.get('ideaId')),
      scriptId: toOptionalString(form.get('scriptId')),
      title: form.get('title'),
      channel: form.get('channel'),
      scheduledAt: form.get('scheduledAt'),
      status: form.get('status'),
      assigneeId: toOptionalString(form.get('assigneeId')),
      notes: toOptionalString(form.get('notes')) ?? '',
    })
    await createCalendarItem(parsed)
    revalidatePath('/calendar')
    revalidatePath('/dashboard')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function updateCalendarStatusAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await updateCalendarItem(String(form.get('itemId') ?? ''), { status: String(form.get('status') ?? 'PLANNED') })
    revalidatePath('/calendar')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function deleteCalendarItemAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await deleteCalendarItem(String(form.get('itemId') ?? ''))
    revalidatePath('/calendar')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}
