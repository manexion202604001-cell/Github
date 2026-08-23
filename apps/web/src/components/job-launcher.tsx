'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { Button } from '@/components/ui/button'
import { Notice, Progress } from '@/components/ui/feedback'

/**
 * 「AI生成を開始 → Job進捗 → 完了で再読込」の定型フローを1つにまとめた部品。
 * 多くの画面(仕様・LP・改善など)で共通利用する。
 */
export function JobLauncher({
  label,
  path,
  body,
  variant = 'primary',
  onDone,
}: {
  label: string
  path: string
  body: unknown
  variant?: 'primary' | 'secondary'
  onDone?: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const job = useJob((finished) => {
    if (finished.status === 'FAILED') setError(finished.error ?? '処理に失敗しました')
    router.refresh()
    onDone?.()
  })

  return (
    <div className="space-y-3">
      <Button
        variant={variant}
        loading={job.running}
        onClick={() => {
          setError(null)
          void api<{ jobId: string }>(path, { method: 'POST', body })
            .then((result) => job.track(result.jobId))
            .catch((caught) => setError(caught instanceof Error ? caught.message : '開始できませんでした'))
        }}
      >
        {label}
      </Button>
      {job.running && job.job ? <Progress value={job.job.progress} showValue /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  )
}
