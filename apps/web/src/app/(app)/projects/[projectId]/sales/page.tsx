import { listSales, summarize } from '@/features/sales/service'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/format'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Stat } from '@/components/ui/stat'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/feedback'
import { SalesForm, SalesAnalysisButton } from './sales-form'

/** STEP 13: 販売データと分析(要件70〜72)。 */
export default async function SalesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const sales = await listSales(projectId)
  const summary = summarize(sales)

  return (
    <div className="space-y-5">
      {sales.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="累計売上" value={formatCurrency(summary.revenue)} sub={`${formatNumber(summary.units)}個`} />
          <Stat label="CVR" value={summary.cvr === null ? '—' : formatPercent(summary.cvr)} />
          <Stat label="TACOS" value={summary.tacos === null ? '—' : formatPercent(summary.tacos)} sub={`広告費 ${formatCurrency(summary.adSpend)}`} />
          <Stat label="返品率" value={summary.returnRate === null ? '—' : formatPercent(summary.returnRate)} sub={`${formatNumber(summary.returns)}件`} />
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="販売データ"
          description="期間ごとの売上・セッション・広告費・返品を記録します。CVR / ACOS / TACOS は自動計算されます。"
          action={<SalesAnalysisButton projectId={projectId} disabled={sales.length === 0} />}
        />
        <CardBody className="space-y-5">
          <SalesForm projectId={projectId} />
          <DataTable
            rows={sales}
            rowKey={(row) => row.id}
            empty={<EmptyState title="販売データはまだありません" description="週次または月次の実績を入力すると、AIが改善点を分析します。" />}
            columns={[
              { key: 'period', header: '期間', render: (row) => `${formatDate(row.periodStart)} 〜 ${formatDate(row.periodEnd)}` },
              { key: 'revenue', header: '売上', align: 'right', render: (row) => formatCurrency(row.revenue) },
              { key: 'units', header: '販売数', align: 'right', render: (row) => formatNumber(row.units) },
              { key: 'cvr', header: 'CVR', align: 'right', render: (row) => (row.cvr === null ? '—' : formatPercent(row.cvr)) },
              { key: 'acos', header: 'ACOS', align: 'right', render: (row) => (row.acos === null ? '—' : formatPercent(row.acos)) },
              { key: 'returns', header: '返品', align: 'right', render: (row) => formatNumber(row.returns) },
              { key: 'rating', header: '評価', align: 'right', render: (row) => (row.rating === null ? '—' : `★${row.rating.toFixed(1)}`) },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  )
}
