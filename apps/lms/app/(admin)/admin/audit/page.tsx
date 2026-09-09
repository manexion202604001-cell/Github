import { requireRole } from '@/lib/auth'
import { listAuditLogs } from '@/lib/db/queries/admin'
import { AUDIT_ACTION_LABEL } from '@/lib/audit'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: '監査ログ' }

/** §11 監査ログ（admin のみ、最新 100 件） */
export default async function AdminAuditPage() {
  await requireRole('admin')
  const logs = await listAuditLogs(100)
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Audit" title="監査ログ" description="ロール変更・退会処理・コンテンツの非表示など、管理操作の記録（最新 100 件）。" />
      {logs.length === 0 ? (
        <p className="py-8 text-center font-serif text-ink-700">記録はまだありません。</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>日時</Th>
              <Th>操作者</Th>
              <Th>操作</Th>
              <Th>対象</Th>
              <Th>詳細</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <Td className="tnum whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
                <Td>{l.actorName ?? 'システム'}</Td>
                <Td>{AUDIT_ACTION_LABEL[l.action] ?? l.action}</Td>
                <Td className="font-mono text-[12px]">
                  {l.targetType ?? ''}
                  {l.targetId ? ` ${l.targetId.slice(0, 8)}…` : ''}
                </Td>
                <Td className="font-mono text-[12px] text-stone-500">{l.detail ? JSON.stringify(l.detail) : ''}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
