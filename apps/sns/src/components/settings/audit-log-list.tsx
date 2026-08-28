import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'

/** 監査ログ(要件105)。誰が・いつ・何をしたかを追える。 */
export function AuditLogList({
  logs,
}: {
  logs: { id: string; action: string; summary: string | null; entityType: string; userName: string; createdAt: string }[]
}) {
  return (
    <Card>
      <CardHeader title="操作履歴" description="ブランド更新・調査実行・削除・権限変更などを記録しています。" />
      <CardBody>
        {logs.length === 0 ? (
          <p className="text-[13px] text-ink-muted">まだ記録がありません。</p>
        ) : (
          <ul className="space-y-1.5">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line px-3 py-2">
                <Badge tone="neutral">{log.action}</Badge>
                <span className="min-w-0 flex-1 truncate text-[13px] text-navy">{log.summary ?? log.entityType}</span>
                <span className="text-[11px] text-ink-muted">{log.userName}</span>
                <span className="text-[11px] text-ink-subtle">{formatDateTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
