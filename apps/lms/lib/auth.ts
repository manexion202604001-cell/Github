import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { profiles, type Profile, type UserRole } from '@/lib/db/schema'
import { devPreviewUserId } from '@/lib/dev-preview'

export type CurrentUser = {
  id: string
  email: string
  profile: Profile
}

/** リクエスト内でキャッシュされる現在ユーザー（未ログインなら null） */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const preview = devPreviewUserId()
  if (preview) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, preview) })
    return profile ? { id: preview, email: 'preview@example.com', profile } : null
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) })
  if (!profile || profile.deletedAt) return null
  return { id: user.id, email: user.email ?? '', profile }
})

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

const ROLE_RANK: Record<UserRole, number> = { student: 0, instructor: 1, admin: 2 }

export function hasRole(profile: Pick<Profile, 'role'>, role: UserRole): boolean {
  return ROLE_RANK[profile.role] >= ROLE_RANK[role]
}

export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await requireUser()
  if (!hasRole(user.profile, role)) redirect('/dashboard')
  return user
}

export function isStaff(profile: Pick<Profile, 'role'>) {
  return hasRole(profile, 'instructor')
}
