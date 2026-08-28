import type { Metadata } from 'next'
import { requireUser } from '@/server/authz'
import { db } from '@/server/db'
import { ProfileForm } from '@/components/settings/profile-form'

export const metadata: Metadata = { title: 'プロフィール設定' }
export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const user = await requireUser()
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { name: true, email: true, jobTitle: true },
  })

  return <ProfileForm name={profile.name ?? ''} email={profile.email} jobTitle={profile.jobTitle ?? ''} />
}
