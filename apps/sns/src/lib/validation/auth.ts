import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().email('メールアドレスの形式が正しくありません').max(200)

export const passwordSchema = z
  .string()
  .min(10, 'パスワードは10文字以上にしてください')
  .max(200, 'パスワードが長すぎます')
  .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), {
    message: '英字と数字をどちらも含めてください',
  })

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'お名前を入力してください').max(80),
  organizationName: z.string().trim().min(1, '組織名を入力してください').max(80),
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'パスワードを入力してください').max(200),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
