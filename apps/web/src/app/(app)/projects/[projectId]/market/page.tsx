import Link from 'next/link'
import { getLatestResearch, getResearch, listResearch, providerInfoFor } from '@/features/market-research/service'
import { DEPTH_CONFIG } from '@/features/market-research/domain'
import { toStringArray } from '@/features/assistant/context'
import { formatCurrency, formatDateTime, formatPercent } from '@/lib/format'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Stat } from '@/components/ui/stat'
import { Badge, SampleDataBadge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { MarketActions, ComplaintChart } from './market-actions'

/** rawDataに保存済みだが専用カラムを持たない分析結果を安全に取り出す。 */
function extraOf(rawData: unknown) {
  const raw = rawData && typeof rawData === 'object' ? (rawData as Record<string, unknown>) : {}
  return {
    priceStrategy: typeof raw.priceStrategy === 'string' ? raw.priceStrategy : null,
    landscape: typeof raw.landscape === 'string' ? raw.landscape : null,
    benchmarkPrice: typeof raw.benchmarkPrice === 'number' ? raw.benchmarkPrice : null,
    sourceErrors: Array.isArray(raw.sourceErrors) ? (raw.sourceErrors as string[]) : [],
  }
}

function priceRangeOf(priceRange: unknown): { min: number; max: number } | null {
  if (!priceRange || typeof priceRange !== 'object') return null
  const range = priceRange as Record<string, unknown>
  return typeof range.min === 'number' && typeof range.max === 'number' ? { min: range.min, max: range.max } : null
}

const STATUS_BADGE = {
  COMPLETED: { tone: 'positive', label: '完了' },
  RUNNING: { tone: 'brand', label: '実行中' },
  PENDING: { tone: 'neutral', label: '待機中' },
  FAILED: { tone: 'critical', label: '失敗' },
} as const

/** STEP 3: 市場調査(要件21〜28)。履歴一覧から過去の調査結果もいつでも参照できる。 */
export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ researchId?: string; keyword?: string }>
}) {
  const { projectId } = await params
  const { researchId, keyword: keywordParam } = await searchParams

  const [research, history, provider] = await Promise.all([
    researchId ? getResearch(projectId, researchId) : getLatestResearch(projectId),
    listResearch(projectId),
    providerInfoFor(projectId),
  ])

  const complaints = (research?.reviews ?? [])
    .filter((review) => review.sentiment === 'NEGATIVE' || review.sentiment === 'IMPROVEMENT_REQUEST')
    .sort((a, b) => b.share - a.share)

  const extra = extraOf(research?.rawData)
  const range = priceRangeOf(research?.priceRange)
  const opportunities = toStringArray(research?.opportunities)
  const threats = toStringArray(research?.threats)
  const keywords = toStringArray(research?.keywords)
  const snsInsights = Array.isArray(research?.snsInsights)
    ? (research.snsInsights as { platform?: string; finding?: string; implication?: string }[]).filter(
        (item) => item && typeof item === 'object' && item.finding,
      )
    : []
  const actionKeyword = keywordParam ?? research?.keyword ?? ''

  return (
    <div className="space-y-5">
      <MarketActions
        key={`${actionKeyword}-${research?.id ?? 'none'}`}
        projectId={projectId}
        hasResearch={research?.status === 'COMPLETED'}
        hasReviews={(research?.reviews?.length ?? 0) > 0}
        currentKeyword={actionKeyword}
        currentDepth={research?.depth ?? 'STANDARD'}
        providerLabel={provider.label}
        providerSynthetic={provider.synthetic}
        status={research?.status ?? null}
        error={research?.error ?? null}
      />

      {history.length > 0 ? (
        <Card>
          <CardHeader
            title="調査履歴"
            description="過去の調査はすべて保存されています。キーワードや深度を変えて追加調査すると、ここに積み上がります。"
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {history.map((item) => {
                const selected = item.id === research?.id
                const badge = STATUS_BADGE[item.status as keyof typeof STATUS_BADGE] ?? STATUS_BADGE.PENDING
                return (
                  <li key={item.id}>
                    <Link
                      href={`/projects/${projectId}/market?researchId=${item.id}`}
                      className={cn(
                        'flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-canvas-alt',
                        selected && 'border-l-2 border-brand bg-brand-wash/40',
                      )}
                    >
                      <span className={cn('min-w-32 text-[13px] font-bold', selected && 'text-brand')}>
                        {item.keyword ?? '(キーワード未設定)'}
                      </span>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <span className="text-[12px] text-ink-muted">{DEPTH_CONFIG[item.depth].label}</span>
                      <span className="text-[12px] text-ink-muted">
                        競合{item._count.competitors}件
                        {item._count.reviews > 0 ? ` / レビュー分析${item._count.reviews}クラスタ` : ''}
                      </span>
                      {item.status === 'COMPLETED' && item.marketSize ? (
                        <span className="text-[12px] text-ink-muted">市場規模 {formatCurrency(item.marketSize)}</span>
                      ) : null}
                      <span className="ml-auto tabular text-[12px] text-ink-subtle">{formatDateTime(item.createdAt)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {research?.status === 'COMPLETED' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="推定市場規模(年)" value={formatCurrency(research.marketSize)} sub="レビュー数×価格による推計" />
            <Stat
              label="平均価格"
              value={formatCurrency(research.averagePrice)}
              sub={range ? `実勢価格帯 ${formatCurrency(range.min)}〜${formatCurrency(range.max)}` : undefined}
            />
            <Stat
              label="競合強度"
              value={research.competitionScore === null ? '—' : `${Math.round(research.competitionScore)} / 100`}
              tone="brand"
              sub="0=参入しやすい / 100=激戦"
            />
            <Stat
              label="成長率"
              value={research.growthRate === null ? '推計不能' : formatPercent(research.growthRate)}
              sub={research.growthRate === null ? 'データ不足のため' : undefined}
            />
          </div>

          <Card>
            <CardHeader
              title={`市場サマリー: ${research.keyword ?? ''}`}
              description={`${research.source} / ${DEPTH_CONFIG[research.depth].label}調査 / ${formatDateTime(research.completedAt ?? research.createdAt)}`}
              action={provider.synthetic ? <SampleDataBadge /> : undefined}
            />
            <CardBody className="space-y-5">
              <p className="text-[14px] leading-7">{research.summary}</p>

              {extra.priceStrategy ? (
                <div className="border-l-2 border-brand bg-brand-wash/50 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-bold text-brand">価格戦略</p>
                    {extra.benchmarkPrice ? (
                      <p className="text-[13px]">
                        推奨ベンチマーク価格{' '}
                        <span className="tabular text-[15px] font-bold text-brand">{formatCurrency(extra.benchmarkPrice)}</span>
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-6">{extra.priceStrategy}</p>
                </div>
              ) : null}

              {extra.landscape ? (
                <div>
                  <p className="text-[13px] font-bold">競合ランドスケープ</p>
                  <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">{extra.landscape}</p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[13px] font-bold text-positive">機会(市場の空白地帯)</p>
                  <ol className="mt-2 space-y-1.5">
                    {opportunities.map((item, index) => (
                      <li key={item} className="flex gap-2.5 bg-positive-wash px-3 py-2 text-[13px] leading-6">
                        <span className="tabular font-bold text-positive">{index + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-critical">脅威・リスク</p>
                  {threats.length > 0 ? (
                    <ol className="mt-2 space-y-1.5">
                      {threats.map((item, index) => (
                        <li key={item} className="flex gap-2.5 bg-critical-wash px-3 py-2 text-[13px] leading-6">
                          <span className="tabular font-bold text-critical">{index + 1}</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-[13px] text-ink-muted">特筆すべき脅威は検出されませんでした。</p>
                  )}
                </div>
              </div>

              {snsInsights.length > 0 ? (
                <div>
                  <p className="text-[13px] font-bold">SNSインサイト</p>
                  <ul className="mt-2 space-y-1.5">
                    {snsInsights.map((item, index) => (
                      <li key={index} className="bg-canvas-alt px-3 py-2 text-[13px] leading-6">
                        <span className="font-bold">{item.platform}</span>: {item.finding}
                        {item.implication ? <span className="text-ink-muted"> → {item.implication}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {keywords.length > 0 ? (
                <div>
                  <p className="text-[13px] font-bold">関連キーワード</p>
                  <p className="mt-1 text-[12px] text-ink-muted">クリックすると検索欄にセットされ、そのキーワードで追加調査できます。</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <Link
                        key={keyword}
                        href={`/projects/${projectId}/market?keyword=${encodeURIComponent(keyword)}`}
                        className="border border-line bg-canvas px-3 py-1 text-[12px] text-ink-muted transition-colors hover:border-brand hover:text-brand"
                      >
                        {keyword} +
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {extra.sourceErrors.length > 0 ? (
                <p className="text-[12px] text-caution">一部データ元の取得に失敗しています: {extra.sourceErrors.join(' / ')}</p>
              ) : null}
            </CardBody>
          </Card>

          {complaints.length > 0 ? (
            <Card>
              <CardHeader
                title="市場の不満ランキング"
                description="競合レビューから抽出した不満クラスタ。ここが差別化の起点になります。"
              />
              <CardBody>
                <ComplaintChart
                  items={complaints.map((complaint) => ({
                    label: complaint.cluster,
                    share: complaint.share,
                    summary: complaint.summary,
                  }))}
                />
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
