'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Notice, Progress } from '@/components/ui/feedback'
import { Card, CardBody, CardHeader } from '@/components/ui/card'

export function SalesForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const num = (key: string) => Number(form.get(key)) || 0
    setError(null)
    void api('/api/sales', {
      method: 'POST',
      body: {
        projectId,
        periodStart: form.get('periodStart'),
        periodEnd: form.get('periodEnd'),
        revenue: num('revenue'),
        units: num('units'),
        sessions: num('sessions'),
        adSpend: num('adSpend'),
        adSales: num('adSales'),
        returns: num('returns'),
        searchRank: form.get('searchRank') ? Number(form.get('searchRank')) : null,
        reviewCount: form.get('reviewCount') ? Number(form.get('reviewCount')) : null,
        rating: form.get('rating') ? Number(form.get('rating')) : null,
        inventory: form.get('inventory') ? Number(form.get('inventory')) : null,
      },
    })
      .then(() => {
        setOpen(false)
        router.refresh()
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : '保存に失敗しました'))
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
        {open ? '閉じる' : '+ 実績を入力'}
      </Button>
      {open ? (
        <form onSubmit={submit} className="grid gap-3 border border-line bg-canvas p-4 sm:grid-cols-3">
          <Field label="期間開始" required>
            <Input name="periodStart" type="date" required />
          </Field>
          <Field label="期間終了" required>
            <Input name="periodEnd" type="date" required />
          </Field>
          <div />
          <Field label="売上(円)" required>
            <Input name="revenue" type="number" min={0} required />
          </Field>
          <Field label="販売数" required>
            <Input name="units" type="number" min={0} required />
          </Field>
          <Field label="セッション数">
            <Input name="sessions" type="number" min={0} />
          </Field>
          <Field label="広告費(円)">
            <Input name="adSpend" type="number" min={0} />
          </Field>
          <Field label="広告経由売上(円)">
            <Input name="adSales" type="number" min={0} />
          </Field>
          <Field label="返品数">
            <Input name="returns" type="number" min={0} />
          </Field>
          <Field label="検索順位">
            <Input name="searchRank" type="number" min={1} />
          </Field>
          <Field label="レビュー数">
            <Input name="reviewCount" type="number" min={0} />
          </Field>
          <Field label="平均評価">
            <Input name="rating" type="number" min={0} max={5} step={0.1} />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" size="sm">
              保存する
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

type Analysis = {
  headline: string
  whatWorked: string[]
  whatFailed: string[]
  returnCauses: string[]
  priorities: { area: string; action: string; expectedImpact: string }[]
  forecast: string | null
}

export function SalesAnalysisButton({ projectId, disabled }: { projectId: string; disabled: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const job = useJob((finished) => {
    if (finished.status === 'FAILED') setError(finished.error ?? '分析に失敗しました')
    else if (finished.status === 'COMPLETED') setAnalysis(finished.result as Analysis)
  })

  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled}
        loading={job.running}
        onClick={() => {
          setError(null)
          void api<{ jobId: string }>('/api/sales', { method: 'PUT', body: { projectId } })
            .then((result) => job.track(result.jobId))
            .catch((caught) => setError(caught instanceof Error ? caught.message : '開始できませんでした'))
        }}
      >
        AIで販売分析
      </Button>
      {job.running && job.job ? <Progress value={job.job.progress} showValue /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {analysis ? (
        <Card className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[70dvh] max-w-2xl overflow-y-auto shadow-xl">
          <CardHeader
            title="AI販売分析"
            action={
              <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)}>
                閉じる
              </Button>
            }
          />
          <CardBody className="space-y-4 text-[13px]">
            <p className="font-bold">{analysis.headline}</p>
            <AnalysisList label="うまくいっている点" items={analysis.whatWorked} tone="text-positive" />
            <AnalysisList label="課題" items={analysis.whatFailed} tone="text-critical" />
            <AnalysisList label="返品の原因" items={analysis.returnCauses} tone="text-caution" />
            <div>
              <p className="font-bold text-brand">優先アクション</p>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-5">
                {analysis.priorities.map((priority) => (
                  <li key={priority.action}>
                    <span className="font-semibold">[{priority.area}]</span> {priority.action}
                    <span className="block text-[12px] text-ink-muted">期待効果: {priority.expectedImpact}</span>
                  </li>
                ))}
              </ol>
            </div>
            {analysis.forecast ? <p className="text-ink-muted">{analysis.forecast}</p> : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}

function AnalysisList({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className={`font-bold ${tone}`}>{label}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
