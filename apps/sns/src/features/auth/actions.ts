'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { actionFailure, type ActionResult } from '@/lib/errors'
import { loginSchema, signupSchema } from '@/lib/validation/auth'
import { login, logout, signup } from './service'
import { rateLimit } from '@/server/rate-limit'
import { AppError } from '@/lib/errors'

async function meta() {
  const store = await headers()
  return {
    userAgent: store.get('user-agent'),
    ip: store.get('x-real-ip') ?? store.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? null,
  }
}

export async function signupAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const parsed = signupSchema.parse({
      name: form.get('name'),
      organizationName: form.get('organizationName'),
      email: form.get('email'),
      password: form.get('password'),
    })
    const info = await meta()
    guard(`signup:${info.ip ?? 'local'}`, 5, 60_000)
    await signup(parsed, info)
  } catch (error) {
    return actionFailure(error)
  }
  redirect('/onboarding')
}

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const parsed = loginSchema.parse({ email: form.get('email'), password: form.get('password') })
    const info = await meta()
    // ブルートフォース対策。IP単位で試行回数を絞る(要件67)。
    guard(`login:${info.ip ?? 'local'}`, 10, 60_000)
    await login(parsed, info)
  } catch (error) {
    return actionFailure(error)
  }
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  await logout()
  redirect('/login')
}

function guard(key: string, limit: number, windowMs: number): void {
  if (!rateLimit(key, limit, windowMs).allowed) {
    throw new AppError('RATE_LIMITED', '試行回数が多すぎます。', { hint: '1分ほど待ってから再度お試しください。' })
  }
}
