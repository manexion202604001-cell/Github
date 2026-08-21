import { z } from 'zod'

export const idSchema = z.string().min(1).max(64)

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const emailSchema = z.string().email().max(254).transform((value) => value.toLowerCase().trim())

export const passwordSchema = z
  .string()
  .min(10, 'パスワードは10文字以上で設定してください')
  .max(200)
  .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), '英字と数字をそれぞれ1文字以上含めてください')

export const nonEmptyString = z.string().trim().min(1)

/** 空文字を null に正規化する。フォームからの入力用。 */
export function optionalString(max = 2000) {
  return z
    .string()
    .max(max)
    .transform((value) => {
      const trimmed = value.trim()
      return trimmed === '' ? null : trimmed
    })
    .nullable()
    .optional()
}

export const stringArray = z.array(z.string().trim().min(1)).max(50).default([])
