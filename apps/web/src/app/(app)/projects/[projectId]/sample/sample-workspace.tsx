'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { SAMPLE_CRITERIA } from '@/features/samples/constants'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { Field, Input, Slider, Textarea } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Notice, Progress } from '@/components/ui/feedback'

type ScoreKey = (typeof SAMPLE_CRITERIA)[number]['key']

type SampleView = {
  id: string
  round: number
  supplierName: string | null
  comment: string | null
  total: number | null
  decision: string | null
  aiSummary: string | null
  aiFindings: { area: string; issue: string; action: string; severity: string }[]
  scores: Record<ScoreKey, number | null>
}

const DECISION: Record<string, { label: string; tone: 'positive' | 'caution' | 'critical' }> = {
  READY_FOR_PRODUCTION: { label: '商品化推奨', tone: 'positive' },
  NEEDS_FIX: { label: '修正推奨', tone: 'caution' },
  NEEDS_RESAMPLE: { label: '再サンプル推奨', tone: 'caution' },
  REJECTED: { label: '量産NG', tone: 'critical' },
}

export function SampleWorkspace({ projectId, samples }: { projectId: string; samples: SampleView[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [comment, setComment] = useState('')
  const [scores, setScores] = useState<Record<ScoreKey, number>>(
    Object.fromEntries(SAMPLE_CRITERIA.map((criterion) => [criterion.key, 7])) as Record<ScoreKey, number>,
  )
  const [saving, setSaving] = useState(false)

  const job = useJob((finished) => {
    if (finished.status === 'FAILED') setError(finished.error ?? 'AI評価に失敗しました')
    router.refresh()
  })

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const nextRound = Math.max(0, ...samples.map((sample) => sample.round)) + 1
      const sample = await api<{ id: string }>('/api/sample-evaluation', {
        method: 'POST',
        body: { projectId, round: nextRound, supplierName: supplierName || null, comment: comment || null, scores },
      })
      const result = await api<{ jobId: string }>('/api/sample-evaluation', {
        method: 'PUT',
        body: { projectId, sampleId: sample.id },
      })
      job.track(result.jobId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardHeader
          title="サンプル評価を登録"
          description="各項目を10点満点で評価すると、AIが100点換算で量産可否を判定します。"
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="OEM会社名">
              <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {SAMPLE_CRITERIA.map((criterion) => (
              <Slider
                key={criterion.key}
                label={criterion.label}
                value={scores[criterion.key]}
                min={0}
                max={10}
                onChange={(value) => setScores((previous) => ({ ...previous, [criterion.key]: value }))}
                format={(value) => `${value} / 10`}
              />
            ))}
          </div>
          <Field label="評価コメント" hint="気づいた点を自由に。AI判定の材料になります。">
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} />
          </Field>
        </CardBody>
        <CardFooter className="flex justify-end">
          <Button onClick={() => void save()} loading={saving || job.running}>
            保存してAI評価を実行
          </Button>
        </CardFooter>
      </Card>

      {job.running && job.job ? <Progress value={job.job.progress} showValue /> : null}

      {samples.map((sample) => {
        const decision = sample.decision ? DECISION[sample.decision] : null
        return (
          <Card key={sample.id}>
            <CardHeader
              title={`第${sample.round}回サンプル ${sample.supplierName ? `(${sample.supplierName})` : ''}`}
              action={
                decision ? (
                  <div className="flex items-center gap-2">
                    <span className="tabular text-lg font-bold">{sample.total ?? '—'}点</span>
                    <Badge tone={decision.tone}>{decision.label}</Badge>
                  </div>
                ) : undefined
              }
            />
            <CardBody className="space-y-4">
              {sample.aiSummary ? <p className="text-[13px] leading-relaxed text-ink-muted">{sample.aiSummary}</p> : null}
              {sample.aiFindings.length > 0 ? (
                <ul className="space-y-2">
                  {sample.aiFindings.map((finding, index) => (
                    <li key={index} className=" border border-line bg-canvas p-4">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold">{finding.area}</p>
                        <Badge tone={finding.severity === 'HIGH' ? 'critical' : finding.severity === 'MID' ? 'caution' : 'neutral'}>
                          {finding.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-ink-muted">{finding.issue}</p>
                      <p className="mt-1.5 bg-brand-wash/60 px-3 py-2 text-[12px] font-semibold text-ink">
                        OEMへの指示: {finding.action}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {SAMPLE_CRITERIA.map((criterion) => (
                  <span key={criterion.key} className=" border border-line bg-canvas px-3 py-1 text-[12px] text-ink-muted">
                    {criterion.label} {sample.scores[criterion.key] ?? '—'}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
