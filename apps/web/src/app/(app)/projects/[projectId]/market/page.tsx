import { getLatestResearch, providerInfoFor } from '@/features/market-research/service'
import { toStringArray } from '@/features/assistant/context'
import { formatCurrency, formatPercent } from '@/lib/format'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Stat } from '@/components/ui/stat'
import { SampleDataBadge } from '@/components/ui/badge'
import { MarketActions, ComplaintChart } from './market-actions'

/** STEP 3: 市場調査(要件21〜28)。 */
export default async function MarketPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [research, provider] = [await getLatestResearch(projectId), await providerInfoFor(projectId)]

  const complaints = (research?.reviews ?? [])
    .filter((review) => review.sentiment === 'NEGATIVE' || review.sentiment === 'IMPROVEMENT_REQUEST')
    .sort((a, b) => b.share - a.share)

  return (
    <div className="space-y-5">
      <MarketActions
        projectId={projectId}
        hasResearch={research?.status === 'COMPLETED'}
        hasReviews={(research?.reviews.length ?? 0) > 0}
        currentKeyword={research?.keyword ?? ''}
        providerLabel={provider.label}
        providerSynthetic={provider.synthetic}
        status={research?.status ?? null}
        error={research?.error ?? null}
      />

      {research?.status === 'COMPLETED' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="推定市場規模(年)" value={formatCurrency(research.marketSize)} sub="レビュー数×価格による推計" />
            <Stat
              label="成長率"
              value={research.growthRate === null ? '—' : formatPercent(research.growthRate)}
            />
            <Stat label="競合強度" value={research.competitionScore === null ? '—' : `${Math.round(research.competitionScore)} / 100`} tone="brand" />
            <Stat label="平均価格" value={formatCurrency(research.averagePrice)} sub={`調査キーワード: ${research.keyword ?? '—'}`} />
          </div>

          <Card>
            <CardHeader
              title="市場サマリー"
              action={provider.synthetic ? <SampleDataBadge /> : undefined}
            />
            <CardBody className="space-y-4">
              <p className="text-[14px] leading-7 text-ink-muted">{research.summary}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[13px] font-bold text-positive">機会</p>
                  <ul className="mt-2 space-y-1.5">
                    {toStringArray(research.opportunities).map((item) => (
                      <li key={item} className=" bg-positive-wash px-3 py-2 text-[13px] text-ink">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-critical">脅威</p>
                  <ul className="mt-2 space-y-1.5">
                    {toStringArray(research.threats).map((item) => (
                      <li key={item} className=" bg-critical-wash px-3 py-2 text-[13px] text-ink">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {toStringArray(research.keywords).length > 0 ? (
                <div>
                  <p className="text-[13px] font-bold">関連キーワード</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {toStringArray(research.keywords).map((keyword) => (
                      <span key={keyword} className=" border border-line bg-canvas px-3 py-1 text-[12px] text-ink-muted">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
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
