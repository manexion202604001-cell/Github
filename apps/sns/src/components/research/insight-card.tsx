import { CircleCheck, Lightbulb, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { INSIGHT_TYPE_DESCRIPTIONS, INSIGHT_TYPE_LABELS, type InsightRecord } from '@/features/research/domain'
import { cn } from '@/lib/cn'

/**
 * Insight Card(要件81)。
 * FACT / INSIGHT / HYPOTHESIS を視覚的に区別し、断定と推論を混ぜない。
 */
const STYLES = {
  FACT: { tone: 'brand' as const, icon: CircleCheck, accent: 'border-l-brand' },
  INSIGHT: { tone: 'insight' as const, icon: Lightbulb, accent: 'border-l-insight' },
  HYPOTHESIS: { tone: 'neutral' as const, icon: HelpCircle, accent: 'border-l-line-strong' },
}

export function InsightCard({
  insight,
  sourceNumbers,
}: {
  insight: InsightRecord
  sourceNumbers: number[]
}) {
  const style = STYLES[insight.insightType]
  const Icon = style.icon

  return (
    <article className={cn('print-block rounded-[16px] border border-l-[3px] border-line bg-surface px-5 py-4', style.accent)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-[15px] font-bold text-navy">{insight.title}</h3>
        <Badge tone={style.tone} title={INSIGHT_TYPE_DESCRIPTIONS[insight.insightType]}>
          <Icon className="h-3 w-3" aria-hidden="true" />
          {INSIGHT_TYPE_LABELS[insight.insightType]}
        </Badge>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">{insight.content}</p>
      {sourceNumbers.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-subtle">
          <span className="font-semibold">出典</span>
          {sourceNumbers.map((number) => (
            <a
              key={number}
              href={`#source-${number}`}
              className="rounded-md bg-canvas-alt px-1.5 py-0.5 font-semibold text-brand transition-colors hover:bg-brand-wash"
            >
              [{number}]
            </a>
          ))}
        </p>
      ) : insight.insightType !== 'HYPOTHESIS' ? (
        <p className="mt-3 text-[11px] text-ink-subtle">出典なし — AIによる推論です。</p>
      ) : null}
    </article>
  )
}

/** 競合カード(要件19)。metaJson に入れた構造をここで展開する。 */
export function CompetitorCard({ insight }: { insight: InsightRecord }) {
  const meta = (insight.metaJson ?? {}) as {
    url?: string | null
    themes?: string[]
    strengths?: string[]
    weaknesses?: string[]
    differentiationRoom?: string
  }

  return (
    <article className="print-block rounded-[16px] border border-line bg-surface px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold text-navy">{insight.title}</h3>
        {meta.url ? (
          <a href={meta.url} target="_blank" rel="noreferrer noopener" className="truncate text-[12px] font-semibold text-brand hover:underline">
            {meta.url}
          </a>
        ) : null}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{insight.content}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetaList label="投稿テーマ" values={meta.themes ?? []} tone="brand" />
        <MetaList label="強み" values={meta.strengths ?? []} tone="positive" />
        <MetaList label="弱み" values={meta.weaknesses ?? []} tone="warning" />
      </div>

      {meta.differentiationRoom ? (
        <div className="mt-4 rounded-[12px] bg-cyan-wash px-4 py-3">
          <p className="text-[11px] font-bold tracking-wide text-[#0a7ea8]">差別化の余地</p>
          <p className="mt-1 text-[13px] leading-relaxed text-navy">{meta.differentiationRoom}</p>
        </div>
      ) : null}
    </article>
  )
}

function MetaList({ label, values, tone }: { label: string; values: string[]; tone: 'brand' | 'positive' | 'warning' }) {
  if (values.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wide text-ink-subtle">{label}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <li key={value}>
            <Badge tone={tone}>{value}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 機会テーマ(要件19 Opportunity)。 */
export function OpportunityCard({ insight, index }: { insight: InsightRecord; index: number }) {
  const meta = (insight.metaJson ?? {}) as { whyNow?: string }
  return (
    <article className="print-block flex gap-4 rounded-[16px] border border-line bg-surface px-5 py-4">
      <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-navy text-[13px] text-white">
        {index + 1}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-navy">{insight.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{insight.content}</p>
        {meta.whyNow ? <p className="mt-2 text-[12px] text-brand">いま狙う理由: {meta.whyNow}</p> : null}
      </div>
    </article>
  )
}
