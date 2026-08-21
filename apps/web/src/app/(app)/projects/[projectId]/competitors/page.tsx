import { listCompetitors } from '@/features/market-research/service'
import { formatCurrency, formatNumber } from '@/lib/format'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/feedback'

/** 競合分析(要件25)。 */
export default async function CompetitorsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const competitors = await listCompetitors(projectId)

  return (
    <Card>
      <CardHeader
        title={`競合商品(${competitors.length}件)`}
        description="市場調査で取得した競合の一覧です。価格・評価・USPを比較できます。"
      />
      <CardBody className="p-0">
        <DataTable
          rows={competitors}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              title="競合データがまだありません"
              description="市場分析ページから市場調査を実行すると、競合商品が一覧されます。"
            />
          }
          columns={[
            {
              key: 'title',
              header: '商品',
              render: (row) => (
                <div className="flex min-w-64 items-center gap-3">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageUrl} alt="" className="h-10 w-10 shrink-0 border border-line object-contain" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 border border-line bg-canvas-alt" />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[13px] leading-snug font-semibold">
                      {row.url ? (
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                          {row.title}
                        </a>
                      ) : (
                        row.title
                      )}
                    </p>
                    <p className="text-[11px] text-ink-subtle">{row.brand ?? 'ブランド不明'}</p>
                  </div>
                </div>
              ),
            },
            { key: 'price', header: '価格', align: 'right', render: (row) => formatCurrency(row.price) },
            {
              key: 'rating',
              header: '評価',
              align: 'right',
              render: (row) => (row.rating === null ? '—' : `★${row.rating.toFixed(1)}`),
            },
            { key: 'reviews', header: 'レビュー', align: 'right', render: (row) => formatNumber(row.reviewCount) },
            { key: 'rank', header: '順位', align: 'right', render: (row) => (row.rank === null ? '—' : `${row.rank}位`) },
            {
              key: 'usp',
              header: 'USP(AI推定)',
              render: (row) => <span className="line-clamp-2 block max-w-64 text-[12px] text-ink-muted">{row.usp ?? '—'}</span>,
            },
          ]}
        />
      </CardBody>
    </Card>
  )
}
