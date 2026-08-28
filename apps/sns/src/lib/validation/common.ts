import { z } from 'zod'
import { CHANNEL_KEYS } from '@/lib/config/channels'
import { checkPublicUrl } from '@/lib/search/url'

export const cuid = z.string().min(1, 'IDが不正です').max(64)

export const shortText = z.string().trim().min(1, '入力してください').max(200, '200文字以内で入力してください')
export const optionalShortText = z.string().trim().max(200, '200文字以内で入力してください').optional().or(z.literal(''))
export const longText = z.string().trim().max(4000, '4000文字以内で入力してください')
export const optionalLongText = longText.optional().or(z.literal(''))

/** http / https のみ許可し、内部ネットワーク宛を拒否する(要件67)。 */
export const publicUrl = z
  .string()
  .trim()
  .refine((value) => checkPublicUrl(value).ok, { message: 'http/httpsの公開URLを入力してください' })

export const optionalPublicUrl = z
  .union([publicUrl, z.literal('')])
  .optional()
  .transform((value) => (value === '' ? undefined : value))

export const channelKey = z.string().refine((value) => CHANNEL_KEYS.includes(value), {
  message: '対応していないSNSです',
})

/** 改行・カンマ区切りの自由入力を配列にする。UIのタグ入力と対で使う。 */
export const stringList = z
  .array(z.string().trim().min(1).max(120))
  .max(30, '30件までにしてください')
  .default([])

export function toStringList(value: FormDataEntryValue | null, limit = 30): string[] {
  if (typeof value !== 'string') return []
  return value
    .split(/[\n,、]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, limit)
}

/** チェックボックス群など、同名で複数送られる値を配列で受け取る。 */
export function toMultiValue(form: FormData, key: string): string[] {
  return form.getAll(key).filter((value): value is string => typeof value === 'string' && value.length > 0)
}

export function toOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}
