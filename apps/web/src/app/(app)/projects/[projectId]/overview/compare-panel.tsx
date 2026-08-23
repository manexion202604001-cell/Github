'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Notice, Progress } from '@/components/ui/feedback'

export type CompareField = {
  key: string
  label: string
  userValue: string | null
  aiProposal: string
  evaluation: string
  better: 'USER' | 'AI' | 'EVEN'
  score: number
}

export type CompareResult = {
  overallScore: number
  verdict: string
  summary: string
  fields: CompareField[]
  synthetic?: boolean
}

const BETTER_LABEL: Record<CompareField['better'], { text: string; tone: 'positive' | 'brand' | 'neutral' }> = {
  USER: { text: 'あなたの案が優勢', tone: 'positive' },
  AI: { text: 'AI案が優勢', tone: 'brand' },
  EVEN: { text: '互角', tone: 'neutral' },
}

/**
 * 商品概要の比較評価パネル。画面右からスライドインし、
 * ユーザーの入力とAI独自案を項目ごとに並べて表示する。
 */
export function ComparePanel({
  open,
  running,
  progress,
  error,
  result,
  onClose,
  onAdopt,
}: {
  open: boolean
  running: boolean
  progress: number
  error: string | null
  result: CompareResult | null
  onClose: () => void
  onAdopt: (key: string, proposal: string) => void
}) {
  const [adopted, setAdopted] = useState<Record<string, boolean>>({})

  if (!open) return null

  const adopt = (field: CompareField) => {
    onAdopt(field.key, field.aiProposal)
    setAdopted((previous) => ({ ...previous, [field.key]: true }))
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} aria-hidden="true" />
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-[460px] translate-x-0 animate-[mx-slide-in_0.25s_ease-out] flex-col border-l border-line bg-surface shadow-2xl"
        role="dialog"
        aria-label="AI比較評価"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-[15px] font-bold">AI比較評価</p>
            <p className="text-[12px] text-ink-subtle">あなたの入力 × AIが独自に考えた案</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-ink-subtle hover:bg-canvas-alt hover:text-ink"
            aria-label="閉じる"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="mx-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {running ? (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold">AIが独自案を作成し、あなたの入力と比較しています…</p>
              <Progress value={progress} showValue />
            </div>
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}

          {result ? (
            <>
              {result.synthetic ? (
                <Notice tone="warning">AIプロバイダ未設定のため、サンプルの比較結果を表示しています。</Notice>
              ) : null}

              <div className="border border-line bg-canvas px-5 py-4">
                <div className="flex items-baseline gap-3">
                  <p className="tabular text-4xl font-black text-brand">{Math.round(result.overallScore)}</p>
                  <p className="text-[12px] font-semibold text-ink-subtle">/ 100 企画完成度</p>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed font-semibold">{result.verdict}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{result.summary}</p>
              </div>

              {result.fields.map((field) => {
                const better = BETTER_LABEL[field.better]
                return (
                  <section key={field.key} className="border border-line">
                    <div className="flex items-center justify-between gap-2 border-b border-line bg-canvas px-4 py-2.5">
                      <p className="text-[13px] font-bold">{field.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="tabular text-[12px] font-bold text-ink-muted">{Math.round(field.score)}点</span>
                        <Badge tone={better.tone}>{better.text}</Badge>
                      </div>
                    </div>
                    <div className="space-y-3 px-4 py-3.5">
                      <div>
                        <p className="text-[11px] font-bold text-ink-subtle">あなたの入力</p>
                        <p className={cn('mt-1 text-[13px] leading-relaxed', !field.userValue && 'text-ink-subtle')}>
                          {field.userValue ?? '(未入力)'}
                        </p>
                      </div>
                      <div className="bg-brand-wash/60 px-3 py-2.5">
                        <p className="text-[11px] font-bold text-brand">AIの案</p>
                        <p className="mt-1 text-[13px] leading-relaxed">{field.aiProposal}</p>
                      </div>
                      <p className="text-[12px] leading-relaxed text-ink-muted">{field.evaluation}</p>
                      <div className="flex justify-end">
                        <Button size="sm" variant="secondary" disabled={adopted[field.key]} onClick={() => adopt(field)}>
                          {adopted[field.key] ? 'フォームに反映済み' : 'AIの案を採用'}
                        </Button>
                      </div>
                    </div>
                  </section>
                )
              })}

              <p className="text-[11px] leading-relaxed text-ink-subtle">
                「AIの案を採用」はフォームに反映されるだけです。内容を確認して「保存する」を押すと確定します。
              </p>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
