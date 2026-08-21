import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { apiHandler } from '@/server/api'
import { AppError } from '@/lib/errors'
import { randomToken } from '@/server/crypto'
import { googleAuthUrl, isGoogleEnabled } from '@/features/auth/service'

/** Googleログイン開始。CSRF対策のstateをCookieに保存してリダイレクトする。 */
export const GET = apiHandler(async (_request: NextRequest) => {
  if (!isGoogleEnabled()) {
    throw new AppError('VALIDATION_ERROR', 'Googleログインは現在設定されていません')
  }
  const state = randomToken(16)
  const store = await cookies()
  store.set('mx_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })
  return NextResponse.redirect(googleAuthUrl(state))
})
