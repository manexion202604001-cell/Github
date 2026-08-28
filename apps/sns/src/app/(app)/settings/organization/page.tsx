import type { Metadata } from 'next'
import { getCurrentOrganization, listAuditLogs } from '@/features/organizations/service'
import { OrganizationForm } from '@/components/settings/organization-form'
import { AuditLogList } from '@/components/settings/audit-log-list'
import { roleAtLeast } from '@/features/organizations/domain'

export const metadata: Metadata = { title: '組織設定' }
export const dynamic = 'force-dynamic'

export default async function OrganizationSettingsPage() {
  const organization = await getCurrentOrganization()
  const canViewAudit = roleAtLeast(organization.role, 'ADMIN')
  const logs = canViewAudit ? await listAuditLogs(30) : []

  return (
    <div className="space-y-6">
      <OrganizationForm
        name={organization.name}
        slug={organization.slug}
        memberCount={organization.memberCount}
        role={organization.role}
      />

      {canViewAudit ? (
        <AuditLogList
          logs={logs.map((log) => ({
            id: log.id,
            action: log.action,
            summary: log.summary,
            entityType: log.entityType,
            userName: log.user?.name ?? log.user?.email ?? 'システム',
            createdAt: log.createdAt.toISOString(),
          }))}
        />
      ) : null}
    </div>
  )
}
