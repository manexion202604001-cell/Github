import { requireUser } from '@/lib/auth'
import { ProfileForm } from './ProfileForm'

export const metadata = { title: 'プロフィール設定' }

export default async function ProfileSettingsPage() {
  const user = await requireUser()
  const p = user.profile
  return (
    <ProfileForm
      initial={{
        displayName: p.displayName,
        bio: p.bio,
        level: p.level,
        isPublic: p.isPublic,
        hideFromRanking: p.hideFromRanking,
        avatarUrl: p.avatarUrl,
        role: p.role,
      }}
    />
  )
}
