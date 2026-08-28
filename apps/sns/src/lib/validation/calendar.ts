import { z } from 'zod'
import { CALENDAR_STATUS_KEYS } from '@/lib/config/taxonomy'
import { channelKey, cuid, optionalLongText, shortText } from './common'

export const calendarItemSchema = z.object({
  brandId: cuid,
  ideaId: cuid.optional(),
  scriptId: cuid.optional(),
  title: shortText,
  channel: channelKey,
  scheduledAt: z.coerce.date({ invalid_type_error: '投稿予定日時を入力してください' }),
  status: z.string().refine((value) => CALENDAR_STATUS_KEYS.includes(value), '対応していないステータスです'),
  assigneeId: cuid.optional(),
  notes: optionalLongText,
})

export type CalendarItemInput = z.infer<typeof calendarItemSchema>
