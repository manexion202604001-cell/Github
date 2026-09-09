import { Badge } from '@/components/ui/Badge'
import { QA_STATUS_LABEL, type QaStatus } from '@/lib/db/queries/qa'

/** QA-04: ステータスバッジ（open は bronze 枠、answered/resolved は控えめ） */
export function QaStatusBadge({ status }: { status: QaStatus }) {
  return <Badge variant={status === 'open' ? 'status' : status === 'answered' ? 'tag' : 'muted'}>{QA_STATUS_LABEL[status]}</Badge>
}
