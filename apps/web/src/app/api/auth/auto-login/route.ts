import { NextResponse, type NextRequest } from 'next/server'
import { apiHandler, requestMeta } from '@/server/api'
import { env } from '@/lib/env'
import { getCurrentUser } from '@/server/auth/session'
import { autoLogin } from '@/features/auth/service'

/**
 * 開発フェーズ: ログイン画面を経由せず即アプリを開くための自動ログイン。
 * AUTO_LOGIN=false にすると /login へ戻るだけになり、従来の認証フローが復活する。
 */
export const GET = apiHandler(async (request: NextRequest) => {
  if (!env.auth.autoLogin) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }
  if (!(await getCurrentUser())) {
    await autoLogin(requestMeta(request))
  }
  return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
})
