'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { runResearchAction } from '@/features/research/actions'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { RESEARCH_STAGES } from '@/features/research/domain'
import { cn } from '@/lib/cn'

/**
 * 調査の実行と進捗表示(要件87, 98)。
 * Spinnerだけを出さず、いま何をしているかを段階で示す。
 * 実行中はボタンを無効化して連打を防ぐ。
 */
export function ResearchRunPanel({
  researchId,
  status,
  errorMessage,
  autostart,
}: {
  researchId: string
  status: string
  errorMessage: string | null
  autostart: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [running, setRunning] = useState(status === 'PLANNING' || status === 'SEARCHING' || status === 'ANALYZING')
  const [stageIndex, setStageIndex] = useState(0)
  const [failure, setFailure] = useState<{ message: string; hint: string | null } | null>(
    status === 'FAILED' && errorMessage ? { message: errorMessage, hint: '内容を確認して、もう一度実行してください。' } : null,
  )
  const [, startTransition] = useTransition()
  const started = useRef(false)

  const run = useCallback(async () => {
    setRunning(true)
    setFailure(null)
    setStageIndex(0)

    const result = await runResearchAction(researchId)

    if (result.ok) {
      setStageIndex(RESEARCH_STAGES.length - 1)
      toast.success('調査が完了しました', `出典${result.data.sourceCount}件・インサイト${result.data.insightCount}件を保存しました。`)
      if (result.data.searchFailures.length > 0) {
        toast.notify({
          tone: 'warning',
          title: '一部の検索は取得できませんでした',
          description: '取得できた情報の範囲でレポートを作成しています。',
        })
      }
      startTransition(() => router.refresh())
    } else {
      setFailure({ message: result.message, hint: result.hint })
      toast.error(result.message, result.hint ?? undefined)
    }
    setRunning(false)
  }, [researchId, router, toast])

  // 作成直後(?autostart=1)は自動で1度だけ実行する。
  useEffect(() => {
    if (autostart && !started.current && status === 'DRAFT') {
      started.current = true
      void run()
    }
  }, [autostart, status, run])

  // 進捗ステージの見かけを進める。実処理の完了で最終段階へ揃える。
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      setStageIndex((index) => Math.min(index + 1, RESEARCH_STAGES.length - 1))
    }, 6000)
    return () => clearInterval(timer)
  }, [running])

  if (running) {
    return (
      <div className="rounded-[18px] border border-line bg-surface px-5 py-5 shadow-[0_8px_30px_rgba(15,39,80,0.06)]">
        <div className="flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
          <p className="text-[14px] font-bold text-navy">市場調査を実行しています</p>
        </div>
        <ol className="mt-4 space-y-2.5" aria-live="polite">
          {RESEARCH_STAGES.map((stage, index) => {
            const done = index < stageIndex
            const current = index === stageIndex
            return (
              <li key={stage.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]',
                    done && 'border-positive bg-positive-wash text-positive',
                    current && 'border-brand bg-brand-wash text-brand',
                    !done && !current && 'border-line text-ink-subtle',
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : current ? <Loader2 className="h-3 w-3 animate-spin" /> : index + 1}
                </span>
                <span className={cn('text-[13px]', current ? 'font-semibold text-navy' : done ? 'text-ink-muted' : 'text-ink-subtle')}>
                  {stage.label}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-subtle">
          このページを離れても処理は続きます。戻ると結果を確認できます。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {failure ? (
        <ErrorState
          title={failure.message}
          hint={failure.hint}
          action={
            <Button size="sm" onClick={() => void run()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              再実行する
            </Button>
          }
        />
      ) : null}

      {status !== 'COMPLETED' && !failure ? (
        <div className="rounded-[18px] border border-line bg-surface px-5 py-5">
          <p className="text-[14px] font-bold text-navy">調査はまだ実行されていません</p>
          <p className="mt-1 text-[13px] text-ink-muted">実行すると、AIが検索計画を立ててWebから情報を集めます。</p>
          <Button className="mt-4" variant="gradient" onClick={() => void run()}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            調査を実行する
          </Button>
        </div>
      ) : null}

      {status === 'COMPLETED' ? (
        <Button variant="secondary" size="sm" onClick={() => void run()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          最新情報で再調査
        </Button>
      ) : null}
    </div>
  )
}
