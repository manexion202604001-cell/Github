import type { Metadata } from 'next'
import { requireOrganization } from '@/server/authz'
import { listIntegrations } from '@/features/integrations/service'
import {
  getUsageSummary,
  listMembers,
  listPendingInvites,
  listRecentAIJobs,
} from '@/features/organizations/service'
import { IntegrationsPanel } from './integrations-panel'
import { MembersPanel } from './members-panel'
import { UsagePanel } from './usage-panel'

export const metadata: Metadata = { title: '設定' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const context = await requireOrganization()
  const [integrations, members, invites, usage, recentJobs] = await Promise.all([
    listIntegrations(context.organizationId),
    listMembers(context.organizationId),
    listPendingInvites(context.organizationId),
    getUsageSummary(context.organizationId),
    listRecentAIJobs(context.organizationId),
  ])

  const canManage = context.role === 'OWNER' || context.role === 'ADMIN'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">設定</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          組織のAPIキー・メンバー・利用量を管理します(あなたの権限: {context.role})
        </p>
      </div>

      <IntegrationsPanel
        initial={integrations.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }))}
        canManage={canManage}
      />

      <MembersPanel
        initialMembers={members.map((member) => ({
          id: member.id,
          role: member.role,
          name: member.user.name,
          email: member.user.email,
        }))}
        initialInvites={invites.map((invite) => ({
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt.toISOString(),
        }))}
        myRole={context.role}
      />

      <UsagePanel
        summary={usage}
        recent={recentJobs.map((job) => ({
          id: job.id,
          purpose: job.purpose,
          provider: job.provider,
          model: job.model,
          status: job.status,
          inputTokens: job.inputTokens,
          outputTokens: job.outputTokens,
          imageCount: job.imageCount,
          estimatedCostMicro: job.estimatedCostMicro,
          createdAt: job.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
