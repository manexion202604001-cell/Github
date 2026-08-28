import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { db } from '@/server/db'
import { hashToken, randomToken } from '@/server/crypto'

export const SESSION_COOKIE = 'sc_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

export type SessionUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  jobTitle: string | null
  onboarded: boolean
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<void> {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt,
    },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
  store.delete(SESSION_COOKIE)
}

/**
 * 未ログインなら null を返し、例外は投げない。
 * layout / page / service から同一リクエスト内で何度も呼ばれるため React.cache でメモ化する。
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    jobTitle: session.user.jobTitle,
    onboarded: session.user.onboardedAt !== null,
  }
})
