import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Download, ExternalLink, Lightbulb } from 'lucide-react'
import { getResearchRun } from '@/features/research/service'
import { AppError } from '@/lib/errors'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { CompetitorCard, InsightCard, OpportunityCard } from '@/components/research/insight-card'
import { ReportNav } from '@/components/research/report-nav'
import { ResearchRunPanel } from '@/components/research/run-panel'
import { PrintButton } from '@/components/ui/print-button'
import { DeleteResearchButton } from '@/components/research/delete-button'
import { groupByCategory, type InsightRecord } from '@/features/research/domain'
import { RESEARCH_SECTIONS, RESEARCH_OBJECTIVES, labelOf } from '@/lib/config/taxonomy'
import { channelLabel } from '@/lib/config/channels'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: '調査レポート' }
export const dynamic = 'force-dynamic'

export default async function ResearchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams

  const run = await getResearchRun(id).catch((error) => {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  })

  const insights: InsightRecord[] = run.insights.map((insight) => ({
    id: insight.id,
    category: insight.category,
    title: insight.title,
    content: insight.content,
    insightType: insight.insightType,
    confidence: insight.confidence,
    sourceIds: insight.sourceIds,
    metaJson: insight.metaJson,
    position: insight.position,
  }))

  const grouped = groupByCategory(insights)
  const sourceNumber = new Map(run.sources.map((source, index) => [source.id, index + 1]))
  const completed = run.status === 'COMPLETED'

  const sections = RESEARCH_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    jaLabel: section.jaLabel,
    count: (grouped[section.key] ?? []).length,
  })).filter((section) => section.count > 0)

  const navSections = completed
    ? [...sections, { key: 'sources', label: 'Sources', jaLabel: '出典', count: run.sources.length }]
    : []

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Market Research', href: '/research' }, { label: run.title }]}
        title={run.title}
        description={run.summary ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            {completed ? (
              <>
                <a
                  href={`/api/research/${run.id}/export`}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-canvas-alt"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Markdown
                </a>
                <PrintButton />
                <LinkButton href={`/ideas?brandId=${run.brandId}&researchId=${run.id}&generate=1`} variant="gradient">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  この情報から企画を作る
                </LinkButton>
              </>
            ) : null}
            <DeleteResearchButton researchId={run.id} title={run.title} />
          </div>
        }
      />

      {/* 調査結果の要約情報(要件80)。 */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryTile label="ブランド" value={run.brand.name} />
        <SummaryTile label="SNS" value={channelLabel(run.channel)} />
        <SummaryTile label="調査対象地域" value={run.region} />
        <SummaryTile label="調査目的" value={labelOf(RESEARCH_OBJECTIVES, run.objective)} />
        <SummaryTile label="出典数 / 調査日" value={`${run.sources.length}件 / ${formatDate(run.createdAt)}`} />
      </div>

      <div className="no-print mt-6">
        <ResearchRunPanel
          researchId={run.id}
          status={run.status}
          errorMessage={run.errorMessage}
          autostart={query.autostart === '1'}
        />
      </div>

      {completed ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <ReportNav sections={navSections} />
          </div>

          <div className="min-w-0 space-y-10">
            {sections.map((section) => (
              <section key={section.key} id={`section-${section.key}`} className="scroll-mt-24">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold tracking-[-0.02em] text-navy">{section.jaLabel}</h2>
                  <span className="text-[11px] font-bold tracking-[0.14em] text-ink-subtle">{section.label.toUpperCase()}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {(grouped[section.key] ?? []).map((insight, index) => {
                    if (section.key === 'competitor') return <CompetitorCard key={insight.id} insight={insight} />
                    if (section.key === 'opportunity') return <OpportunityCard key={insight.id} insight={insight} index={index} />
                    return (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        sourceNumbers={insight.sourceIds
                          .map((sourceId) => sourceNumber.get(sourceId))
                          .filter((value): value is number => value !== undefined)}
                      />
                    )
                  })}
                </div>
              </section>
            ))}

            <section id="section-sources" className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold tracking-[-0.02em] text-navy">出典</h2>
                <span className="text-[11px] font-bold tracking-[0.14em] text-ink-subtle">SOURCES</span>
              </div>
              <Card className="mt-4">
                <CardBody className="space-y-2">
                  {run.sources.length === 0 ? (
                    <p className="text-[13px] text-ink-muted">出典が保存されていません。</p>
                  ) : (
                    run.sources.map((source, index) => (
                      <div key={source.id} id={`source-${index + 1}`} className="scroll-mt-24 rounded-[12px] border border-line px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="tabular mt-0.5 text-[12px] text-ink-subtle">[{index + 1}]</span>
                          <div className="min-w-0 flex-1">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px] font-semibold text-navy hover:text-brand hover:underline"
                            >
                              <span className="min-w-0 truncate">{source.title}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </a>
                            <p className="mt-0.5 text-[12px] text-ink-subtle">{source.domain}</p>
                            {source.snippet ? (
                              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">{source.snippet}</p>
                            ) : null}
                          </div>
                          <Badge tone="neutral" className="hidden shrink-0 sm:inline-flex">
                            {source.searchQuery}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>

              <p className="mt-4 text-[12px] leading-relaxed text-ink-subtle">
                SOURCE FACT は出典から確認できた内容、AI INSIGHT はAIによる示唆、HYPOTHESIS は検証が必要な仮説です。数値や固有名詞は、必ず出典元でご確認ください。
              </p>
            </section>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-ink-subtle">{label}</p>
      <p className="mt-1 truncate text-[13px] font-bold text-navy" title={value}>
        {value}
      </p>
    </div>
  )
}
