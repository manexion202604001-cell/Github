'use client'

import { useRouter } from 'next/navigation'
import { api } from '@/hooks/api'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/field'

const TARGET_LABEL: Record<string, string> = {
  PRICE: '価格',
  IMAGE: '画像',
  LP: 'LP',
  VIDEO: '動画',
  SEO: 'SEO',
  ADVERTISING: '広告',
  SPECIFICATION: '商品仕様',
  PACKAGING: 'パッケージ',
  SIZE: 'サイズ',
  NEXT_LOT: '次回ロット',
}

const STATUS_LABEL: Record<string, string> = {
  PROPOSED: '提案中',
  ACCEPTED: '採用',
  IN_PROGRESS: '対応中',
  DONE: '完了',
  REJECTED: '見送り',
}

type ImprovementView = {
  id: string
  target: string
  status: string
  title: string
  currentState: string | null
  proposal: string
  reason: string
  expectedEffect: string | null
  priority: number
}

export function ImprovementList({ projectId, improvements }: { projectId: string; improvements: ImprovementView[] }) {
  const router = useRouter()

  const updateStatus = (id: string, status: string) => {
    void api('/api/improvements', { method: 'PATCH', body: { projectId, id, status } }).then(() => router.refresh())
  }

  return (
    <Card>
      <CardHeader title={`改善提案(${improvements.length}件)`} />
      <CardBody className="space-y-3">
        {improvements.map((improvement) => (
          <div key={improvement.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone="brand">{TARGET_LABEL[improvement.target] ?? improvement.target}</Badge>
                <Badge tone={improvement.priority <= 2 ? 'critical' : 'neutral'}>優先度 {improvement.priority}</Badge>
              </div>
              <Select
                className="h-8 w-28 py-1 text-[12px]"
                value={improvement.status}
                onChange={(event) => updateStatus(improvement.id, event.target.value)}
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-2 text-[14px] font-bold">{improvement.title}</p>
            {improvement.currentState ? (
              <p className="mt-1 text-[13px]">
                <span className="text-ink-subtle">{improvement.currentState}</span>
                <span className="mx-2 text-brand">→</span>
                <span className="font-semibold">{improvement.proposal}</span>
              </p>
            ) : (
              <p className="mt-1 text-[13px] font-semibold">{improvement.proposal}</p>
            )}
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{improvement.reason}</p>
            {improvement.expectedEffect ? (
              <p className="mt-1 text-[12px] text-positive">期待効果: {improvement.expectedEffect}</p>
            ) : null}
          </div>
        ))}
      </CardBody>
    </Card>
  )
}
