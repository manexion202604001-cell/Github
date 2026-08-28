import type { Metadata } from 'next'
import Link from 'next/link'
import { FlaskConical, Plus } from 'lucide-react'
import { listResearchRuns } from '@/features/research/service'
import { listBrands } from '@/features/brands/service'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { EmptyState } from '@/components/ui/empty-state'
import { channelLabel } from '@/lib/config/channels'
import { formatDate } from '@/lib/format'
import { RESEARCH_OBJECTIVES, labelOf } from '@/lib/config/taxonomy'

export const metadata: Metadata = { title: '市場調査' }
export const dynamic = 'force-dynamic'

const STATUS_TONE = {
  COMPLETED: { tone: 'positive' as const, label: '完了' },
  FAILED: { tone: 'danger' as const, label: '失敗' },
  DRAFT: { tone: 'neutral' as const, label: '未実行' },
  PLANNING: { tone: 'brand' as const, label: '実行中' },
  SEARCHING: { tone: 'brand' as const, label: '実行中' },
  ANALYZING: { tone: 'brand' as const, label: '実行中' },
}

export default async function ResearchListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const brands = await listBrands()
  const requestedBrandId = typeof params.brandId === 'string' ? params.brandId : undefined
  const brandId = brands.find((brand) => brand.id === requestedBrandId)?.id ?? brands[0]?.id

  const runs = await listResearchRuns(brandId ? { brandId } : {})

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Market Research' }]}
        title="市場調査"
        description="AIが検索計画を立て、Webから根拠を集めて、SNS発信につながる形へ整理します。"
        action={
          brandId ? (
            <LinkButton href={`/research/new?brandId=${brandId}`} variant="gradient">
              <Plus className="h-4 w-4" aria-hidden="true" />
              新しい市場調査
            </LinkButton>
          ) : null
        }
      />

      {runs.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<FlaskConical className="h-6 w-6" />}
          title="まだ市場調査がありません"
          description="調査を1件実行すると、顧客の悩み・競合の発信・まだ取れていないテーマが整理され、企画づくりの根拠になります。"
          action={
            brandId ? (
              <LinkButton href={`/research/new?brandId=${brandId}`} variant="gradient" size="lg">
                最初の市場調査を始める
              </LinkButton>
            ) : (
              <LinkButton href="/brands/new" variant="gradient" size="lg">
                先にブランドを登録する
              </LinkButton>
            )
          }
        />
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {runs.map((run) => {
            const status = STATUS_TONE[run.status] ?? STATUS_TONE.DRAFT
            return (
              <Card key={run.id} className="transition-[border-color,box-shadow] hover:border-brand/35 hover:shadow-[0_16px_44px_rgba(15,39,80,0.1)]">
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/research/${run.id}`} className="block truncate text-[15px] font-bold text-navy hover:text-brand">
                        {run.title}
                      </Link>
                      <p className="mt-1 text-[12px] text-ink-muted">
                        {run.brand.name} ・ {channelLabel(run.channel)} ・ {run.region}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  {run.summary ? (
                    <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{run.summary}</p>
                  ) : run.status === 'FAILED' ? (
                    <p className="mt-3 text-[13px] text-danger">{run.errorMessage ?? '調査に失敗しました。'}</p>
                  ) : (
                    <p className="mt-3 text-[13px] text-ink-subtle">調査を実行すると、ここに要約が表示されます。</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[12px] text-ink-muted">
                    <span>{formatDate(run.createdAt)}</span>
                    <span className="tabular">出典 {run._count.sources}件</span>
                    <span className="tabular">インサイト {run._count.insights}件</span>
                    <span className="tabular">企画 {run._count.ideas}件</span>
                    <span className="ml-auto">{labelOf(RESEARCH_OBJECTIVES, run.objective)}</span>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
