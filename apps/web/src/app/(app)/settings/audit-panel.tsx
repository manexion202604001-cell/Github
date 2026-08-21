'use client'

import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'

type AuditRow = {
  id: string
  action: string
  entityType: string
  summary: string | null
  actor: string
  createdAt: string
}

/** 「誰が・いつ・何を変更したか」の一覧(要件113)。 */
export function AuditPanel({ logs }: { logs: AuditRow[] }) {
  return (
    <Card>
      <CardHeader title="監査ログ" description="組織内の重要な操作の履歴(直近50件)。" />
      <CardBody className="p-0">
        <DataTable
          rows={logs}
          rowKey={(row) => row.id}
          empty={<EmptyState title="まだ操作履歴がありません" />}
          columns={[
            { key: 'at', header: '日時', render: (row) => <span className="text-[12px] whitespace-nowrap">{formatDateTime(row.createdAt)}</span>, width: '160px' },
            { key: 'actor', header: '実行者', render: (row) => <span className="text-[12px]">{row.actor}</span> },
            { key: 'action', header: '操作', render: (row) => <code className="text-[11px] text-ink-muted">{row.action}</code> },
            { key: 'summary', header: '内容', render: (row) => <span className="text-[12px]">{row.summary ?? row.entityType}</span> },
          ]}
        />
      </CardBody>
    </Card>
  )
}
