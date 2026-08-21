'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { Notice, Progress } from '@/components/ui/feedback'
import { SampleDataBadge } from '@/components/ui/badge'
import { formatPercent } from '@/lib/format'

export function MarketActions({
  projectId,
  hasResearch,
  hasReviews,
  currentKeyword,
  providerLabel,
  providerSynthetic,
  status,
  error: researchError,
}: {
  projectId: string
  hasResearch: boolean
  hasReviews: boolean
  currentKeyword: string
  providerLabel: string
  providerSynthetic: boolean
  status: string | null
  error: string | null
}) {
  const router = useRouter()
  const [keyword, setKeyword] = useState(currentKeyword)
  const [error, setError] = useState<string | null>(null)
  const job = useJob((finished) => {
    if (finished.status === 'FAILED') setError(finished.error ?? '調査に失敗しました')
    router.refresh()
  })

  const start = async (path: string, body: unknown) => {
    setError(null)
    try {
      const result = await api<{ jobId: string }>(path, { method: 'POST', body })
      job.track(result.jobId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '開始できませんでした')
    }
  }

  return (
    <Card>
      <CardHeader
        title="AI市場調査"
        description={`データ元: ${providerLabel}`}
        action={providerSynthetic ? <SampleDataBadge /> : undefined}
      />
      <CardBody className="space-y-4">
        {providerSynthetic ? (
          <Notice tone="warning">
            市場データProviderが未設定のため、サンプルデータで調査フローを体験できます。実データは MARKET_DATA_PROVIDER の設定後に取得されます。
          </Notice>
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {status === 'FAILED' && researchError ? <Notice tone="error">前回の調査が失敗しました: {researchError}</Notice> : null}

        <div className="flex flex-wrap items-end gap-3">
          <Field label="検索キーワード" className="min-w-64 flex-1" hint="空欄なら商品カテゴリ/商品名を使用します">
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="衣類スチーマー" />
          </Field>
          <Button
            onClick={() => void start('/api/market-research', { projectId, keyword: keyword || undefined })}
            disabled={job.running}
          >
            {hasResearch ? '再調査する' : '市場調査を開始'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void start('/api/reviews/analyze', { projectId })}
            disabled={job.running || !hasResearch}
          >
            {hasReviews ? 'レビューを再解析' : 'レビューを解析'}
          </Button>
        </div>

        {job.running && job.job ? (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">分析中…(商品取得 → AI分析 → 競合保存)</p>
            <Progress value={job.job.progress} />
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}

export function ComplaintChart({ items }: { items: { label: string; share: number; summary: string }[] }) {
  const max = Math.max(...items.map((item) => item.share), 0.01)
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-bold">{item.label}</p>
            <p className="tabular text-[13px] font-bold text-brand">{formatPercent(item.share, 0)}</p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(item.share / max) * 100}%` }} />
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{item.summary}</p>
        </li>
      ))}
    </ul>
  )
}
