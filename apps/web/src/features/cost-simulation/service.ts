import 'server-only'
import { db } from '@/server/db'
import { requireProjectAccess } from '@/server/authz'
import { recordAudit } from '@/server/audit'
import { advanceStage } from '@/features/projects/service'
import { DEFAULT_COST_INPUT, calculateCost, type CostInput } from './domain'

export async function getSimulation(projectId: string) {
  await requireProjectAccess(projectId)
  const existing = await db.costSimulation.findFirst({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  })
  if (existing) return existing

  // 未作成なら、商品の想定価格から初期値を組み立てて返す(保存はしない)。
  const product = await db.product.findUnique({ where: { projectId }, select: { price: true } })
  const input: CostInput = { ...DEFAULT_COST_INPUT, sellingPrice: product?.price ?? DEFAULT_COST_INPUT.sellingPrice }
  const result = calculateCost(input)

  return {
    id: '',
    projectId,
    label: 'default',
    currency: 'JPY',
    ...input,
    grossProfit: result.grossProfit,
    grossProfitRate: result.grossProfitRate,
    operatingProfit: result.operatingProfit,
    operatingProfitRate: result.operatingProfitRate,
    profitPerUnit: result.profitPerUnit,
    breakEvenUnits: result.breakEvenUnits,
    allowableAdCost: result.allowableAdCost,
    maxManufacturingCost: result.maxManufacturingCost,
    reverseInput: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function saveSimulation(
  projectId: string,
  input: CostInput & { label?: string; targetProfitRate?: number },
) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const result = calculateCost(input)
  const label = input.label ?? 'default'

  const existing = await db.costSimulation.findFirst({ where: { projectId, label }, select: { id: true } })

  const data = {
    projectId,
    label,
    sellingPrice: Math.round(input.sellingPrice),
    manufacturingCost: Math.round(input.manufacturingCost),
    shipping: Math.round(input.shipping),
    importCost: Math.round(input.importCost),
    tax: Math.round(input.tax),
    packaging: Math.round(input.packaging),
    amazonFeeRate: input.amazonFeeRate,
    fbaFee: Math.round(input.fbaFee),
    advertisingRate: input.advertisingRate,
    returnRate: input.returnRate,
    otherCost: Math.round(input.otherCost),
    monthlyUnits: Math.round(input.monthlyUnits),
    fixedCost: Math.round(input.fixedCost),
    grossProfit: result.grossProfit,
    grossProfitRate: result.grossProfitRate,
    operatingProfit: result.operatingProfit,
    operatingProfitRate: result.operatingProfitRate,
    profitPerUnit: result.profitPerUnit,
    breakEvenUnits: result.breakEvenUnits,
    allowableAdCost: result.allowableAdCost,
    maxManufacturingCost: result.maxManufacturingCost,
    reverseInput: input.targetProfitRate === undefined ? undefined : { targetProfitRate: input.targetProfitRate },
  }

  const saved = existing
    ? await db.costSimulation.update({ where: { id: existing.id }, data })
    : await db.costSimulation.create({ data })

  await advanceStage(projectId, 'COST_SIMULATION')
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'cost-simulation.save',
    entityType: 'CostSimulation',
    entityId: saved.id,
    summary: `販売価格 ${data.sellingPrice}円 / 営業利益率 ${(result.operatingProfitRate * 100).toFixed(1)}%`,
  })

  return saved
}

export async function listSimulations(projectId: string) {
  await requireProjectAccess(projectId)
  return db.costSimulation.findMany({ where: { projectId }, orderBy: { updatedAt: 'desc' } })
}
