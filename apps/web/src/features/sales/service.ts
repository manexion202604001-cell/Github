import 'server-only'
import { db } from '@/server/db'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { advanceStage } from '@/features/projects/service'

export type SalesInput = {
  periodStart: Date
  periodEnd: Date
  channel?: string
  revenue: number
  units: number
  sessions: number
  adSpend: number
  adSales: number
  searchRank?: number | null
  reviewCount?: number | null
  rating?: number | null
  returns: number
  inventory?: number | null
  profit?: number | null
}

/** CVR/CTR/ACOS/TACOS は入力から導出して保存する(要件71)。 */
export function deriveMetrics(input: SalesInput) {
  const cvr = input.sessions > 0 ? Number((input.units / input.sessions).toFixed(4)) : null
  const acos = input.adSales > 0 ? Number((input.adSpend / input.adSales).toFixed(4)) : null
  const tacos = input.revenue > 0 ? Number((input.adSpend / input.revenue).toFixed(4)) : null
  const returnRate = input.units > 0 ? Number((input.returns / input.units).toFixed(4)) : null
  return { cvr, acos, tacos, returnRate }
}

export async function listSales(projectId: string) {
  await requireProjectAccess(projectId)
  return db.salesData.findMany({ where: { projectId }, orderBy: { periodStart: 'desc' } })
}

export async function upsertSales(projectId: string, input: SalesInput) {
  await requireProjectAccess(projectId, 'EDITOR')
  const channel = input.channel ?? 'amazon.co.jp'
  const metrics = deriveMetrics(input)

  const data = {
    periodEnd: input.periodEnd,
    revenue: Math.round(input.revenue),
    units: Math.round(input.units),
    sessions: Math.round(input.sessions),
    adSpend: Math.round(input.adSpend),
    adSales: Math.round(input.adSales),
    searchRank: input.searchRank ?? null,
    reviewCount: input.reviewCount ?? null,
    rating: input.rating ?? null,
    returns: Math.round(input.returns),
    inventory: input.inventory ?? null,
    profit: input.profit ?? null,
    ...metrics,
  }

  const saved = await db.salesData.upsert({
    where: { projectId_channel_periodStart: { projectId, channel, periodStart: input.periodStart } },
    create: { projectId, channel, periodStart: input.periodStart, ...data },
    update: data,
  })

  await advanceStage(projectId, 'SELLING')
  return saved
}

export async function deleteSales(projectId: string, id: string): Promise<void> {
  await requireProjectAccess(projectId, 'EDITOR')
  await db.salesData.deleteMany({ where: { id, projectId } })
}

export async function startSalesAnalysis(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'improvements.salesAnalysis',
    payload: { projectId },
    createdBy: context.user.id,
  })
}

export function summarize(rows: { revenue: number; units: number; adSpend: number; returns: number; sessions: number }[]) {
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const units = rows.reduce((sum, row) => sum + row.units, 0)
  const adSpend = rows.reduce((sum, row) => sum + row.adSpend, 0)
  const returns = rows.reduce((sum, row) => sum + row.returns, 0)
  const sessions = rows.reduce((sum, row) => sum + row.sessions, 0)

  return {
    revenue,
    units,
    adSpend,
    returns,
    sessions,
    cvr: sessions > 0 ? units / sessions : null,
    tacos: revenue > 0 ? adSpend / revenue : null,
    returnRate: units > 0 ? returns / units : null,
    averagePrice: units > 0 ? Math.round(revenue / units) : null,
  }
}
