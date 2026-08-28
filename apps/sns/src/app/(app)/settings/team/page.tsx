import type { Metadata } from 'next'
import { listMembers } from '@/features/organizations/service'
import { TeamPanel } from '@/components/settings/team-panel'

export const metadata: Metadata = { title: 'メンバー設定' }
export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage() {
  const { members, viewerRole, viewerId } = await listMembers()

  return (
    <TeamPanel
      viewerRole={viewerRole}
      viewerId={viewerId}
      members={members.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user.name ?? '',
        email: member.user.email,
        role: member.role,
        joined: member.joinedAt !== null,
      }))}
    />
  )
}
