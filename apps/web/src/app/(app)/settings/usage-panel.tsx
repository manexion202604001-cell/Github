'use client'

import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Stat } from '@/components/ui/stat'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/feedback'
import { formatDateTime, formatNumber } from '@/lib/format'

type Summary = {
  period: string
  imageGenerationCount: number
  marketResearchCount: number
  videoGenerationCount: number
  llmInputTokens: number
  llmOutputTokens: number
  estimatedCostMicro: number
}

type RecentJob = {
  id: string
  purpose: string
  provider: string
  model: string
  status: string
  inputTokens: number
  outputTokens: number
  imageCount: number
  estimatedCostMicro: number
  createdAt: string
}

function costToYen(micro: number): string {
  return `¥${(micro / 1_000_000).toFixed(2)}`
}

export function UsagePanel({ summary, recent }: { summary: Summary; recent: RecentJob[] }) {
  return (
    <Card>
      <CardHeader
        title={`利用量(${summary.period})`}
        description="AI Provider の利用回数と推定コスト。推定値は目安であり、実際の請求は各Providerの管理画面で確認してください。"
      />
      <CardBody className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="LLMトークン(入力/出力)" value={`${formatNumber(summary.llmInputTokens)} / ${formatNumber(summary.llmOutputTokens)}`} />
          <Stat label="画像生成" value={formatNumber(summary.imageGenerationCount)} sub="枚" />
          <Stat label="市場調査" value={formatNumber(summary.marketResearchCount)} sub="回" />
          <Stat label="推定コスト" value={costToYen(summary.estimatedCostMicro)} tone="brand" />
        </div>

        <DataTable
          rows={recent}
          rowKey={(row) => row.id}
          empty={<EmptyState title="まだAIの利用履歴がありません" description="市場調査や画像生成を実行すると、ここに履歴が表示されます。" />}
          columns={[
            { key: 'at', header: '日時', render: (row) => <span className="text-[12px]">{formatDateTime(row.createdAt)}</span> },
            { key: 'purpose', header: '用途', render: (row) => <span className="text-[12px]">{row.purpose}</span> },
            {
              key: 'provider',
              header: 'Provider',
              render: (row) => (
                <span className="text-[12px]">
                  {row.provider}
                  {row.provider === 'mock' ? <Badge tone="caution" className="ml-1.5">サンプル</Badge> : null}
                </span>
              ),
            },
            {
              key: 'tokens',
              header: 'トークン',
              align: 'right',
              render: (row) =>
                row.imageCount > 0 ? `画像${row.imageCount}枚` : `${formatNumber(row.inputTokens + row.outputTokens)}`,
            },
            { key: 'cost', header: '推定', align: 'right', render: (row) => costToYen(row.estimatedCostMicro) },
          ]}
        />
      </CardBody>
    </Card>
  )
}
