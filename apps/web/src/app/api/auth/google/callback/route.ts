import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { apiHandler, requestMeta } from '@/server/api'
import { env } from '@/lib/env'
import { handleGoogleCallback } from '@/features/auth/service'

export const GET = apiHandler(async (request: NextRequest) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const store = await cookies()
  const expected = store.get('mx_oauth_state')?.value
  store.delete('mx_oauth_state')

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${env.appUrl}/login?error=oauth`)
  }

  try {
    await handleGoogleCallback(code, requestMeta(request))
    return NextResponse.redirect(`${env.appUrl}/dashboard`)
  } catch {
    return NextResponse.redirect(`${env.appUrl}/login?error=oauth`)
  }
})
