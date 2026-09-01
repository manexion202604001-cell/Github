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
import { cn } from '@/lib/cn'
import { DEPTH_CONFIG, DEPTH_ORDER } from '@/features/market-research/domain'

type Depth = (typeof DEPTH_ORDER)[number]

export function MarketActions({
  projectId,
  hasResearch,
  hasReviews,
  currentKeyword,
  currentDepth,
  providerLabel,
  providerSynthetic,
  status,
  error: researchError,
}: {
  projectId: string
  hasResearch: boolean
  hasReviews: boolean
  currentKeyword: string
  currentDepth: Depth
  providerLabel: string
  providerSynthetic: boolean
  status: string | null
  error: string | null
}) {
  const router = useRouter()
  const [keyword, setKeyword] = useState(currentKeyword)
  const [depth, setDepth] = useState<Depth>(currentDepth)
  const [error, setError] = useState<string | null>(null)
  const job = useJob((finished) => {
    if (finished.status === 'FAILED') {
      setError(finished.error ?? '調査に失敗しました')
      router.refresh()
      return
    }
    // 完了した最新の調査を表示する(過去の調査を?researchId=で固定表示していても外す)
    router.replace(`/projects/${projectId}/market`)
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

        <Field label="調査レベル" hint="件数を絞るほど速く、増やすほど網羅的になります">
          <div className="grid gap-2 sm:grid-cols-3">
            {DEPTH_ORDER.map((option) => {
              const config = DEPTH_CONFIG[option]
              const selected = depth === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDepth(option)}
                  disabled={job.running}
                  className={cn(
                    'border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60',
                    selected ? 'border-brand bg-brand-wash' : 'border-line bg-surface hover:border-line-strong',
                  )}
                >
                  <p className={cn('text-[13px] font-bold', selected && 'text-brand')}>{config.label}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{config.description}</p>
                </button>
              )
            })}
          </div>
        </Field>

        <div className="flex flex-wrap items-end gap-3">
          <Field label="検索キーワード" className="min-w-64 flex-1" hint="空欄なら商品カテゴリ/商品名を使用します">
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="衣類スチーマー" />
          </Field>
          <Button
            onClick={() => void start('/api/market-research', { projectId, keyword: keyword || undefined, depth })}
            disabled={job.running}
          >
            {hasResearch ? '追加調査を実行' : '市場調査を開始'}
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
            <p className="text-[13px] font-semibold">
              分析中…(商品取得 → AI分析 → 競合保存){depth === 'DEEP' ? '。完了後、レビュー解析も自動で続けます' : ''}
            </p>
            <Progress value={job.job.progress} showValue />
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
          <div className="mt-1.5 h-2 overflow-hidden bg-line">
            <div className="h-full bg-brand" style={{ width: `${(item.share / max) * 100}%` }} />
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{item.summary}</p>
        </li>
      ))}
    </ul>
  )
}
