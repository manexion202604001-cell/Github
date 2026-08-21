'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Notice, Progress } from '@/components/ui/feedback'

export function ScoreActions({ projectId, hasScore }: { projectId: string; hasScore: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const job = useJob((finished) => {
    if (finished.status === 'FAILED') setError(finished.error ?? '評価に失敗しました')
    router.refresh()
  })

  return (
    <Card>
      <CardHeader
        title="AI商品スコアリング"
        description="市場需要・競合強度・差別化余地・利益性など9項目を100点満点で評価し、GO / IMPROVE GO / NO GO を判定します。"
        action={
          <Button
            onClick={() => {
              setError(null)
              void api<{ jobId: string }>('/api/product-score', { method: 'POST', body: { projectId } })
                .then((result) => job.track(result.jobId))
                .catch((caught) => setError(caught instanceof Error ? caught.message : '開始できませんでした'))
            }}
            loading={job.running}
          >
            {hasScore ? '再評価する' : 'AI評価を実行'}
          </Button>
        }
      />
      {error || (job.running && job.job) ? (
        <CardBody className="space-y-2">
          {error ? <Notice tone="error">{error}</Notice> : null}
          {job.running && job.job ? <Progress value={job.job.progress} /> : null}
        </CardBody>
      ) : null}
    </Card>
  )
}
