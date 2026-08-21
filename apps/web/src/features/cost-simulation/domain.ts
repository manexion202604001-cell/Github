/**
 * 原価・利益シミュレーションの計算(要件37〜41)。
 *
 * この層は純粋関数のみ。DB・Provider・Nextに依存しない。
 *
 * 計算モデル(1販売あたり):
 *  - returnRate は「出荷したうち返品される割合」。返品された商品は再販不可、原価は損失とする。
 *  - Amazon販売手数料(referral fee)は返品時に返還されるため (1 - returnRate) を掛ける。
 *  - 広告費は返品の有無に関わらず発生するため、売上総額に対して掛ける。
 *  - FBA配送料は出荷時点で発生するため全数に掛かる。
 */

export type CostInput = {
  sellingPrice: number
  manufacturingCost: number
  shipping: number
  importCost: number
  tax: number
  packaging: number
  amazonFeeRate: number
  fbaFee: number
  advertisingRate: number
  returnRate: number
  otherCost: number
  monthlyUnits: number
  fixedCost: number
}

export type CostResult = {
  /** 製造原価以外の変動費合計(1個あたり) */
  otherVariableCost: number
  /** 変動費合計(製造原価を含む、1個あたり) */
  variableCost: number
  amazonFee: number
  advertisingCost: number
  returnLoss: number
  grossProfit: number
  grossProfitRate: number
  operatingProfit: number
  operatingProfitRate: number
  profitPerUnit: number
  breakEvenUnits: number
  allowableAdCost: number
  maxManufacturingCost: number
  monthlyRevenue: number
  monthlyOperatingProfit: number
}

export const DEFAULT_COST_INPUT: CostInput = {
  sellingPrice: 5980,
  manufacturingCost: 1480,
  shipping: 220,
  importCost: 120,
  tax: 0,
  packaging: 80,
  amazonFeeRate: 0.15,
  fbaFee: 434,
  advertisingRate: 0.1,
  returnRate: 0.03,
  otherCost: 0,
  monthlyUnits: 300,
  fixedCost: 0,
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(0.99, Math.max(0, value))
}

function safe(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function calculateCost(input: CostInput): CostResult {
  const sellingPrice = Math.max(0, safe(input.sellingPrice))
  const manufacturingCost = Math.max(0, safe(input.manufacturingCost))
  const returnRate = clampRate(input.returnRate)
  const amazonFeeRate = clampRate(input.amazonFeeRate)
  const advertisingRate = clampRate(input.advertisingRate)

  const otherVariableCost =
    Math.max(0, safe(input.shipping)) +
    Math.max(0, safe(input.importCost)) +
    Math.max(0, safe(input.tax)) +
    Math.max(0, safe(input.packaging)) +
    Math.max(0, safe(input.fbaFee)) +
    Math.max(0, safe(input.otherCost))

  const variableCost = manufacturingCost + otherVariableCost

  const netRevenue = sellingPrice * (1 - returnRate)
  const amazonFee = sellingPrice * amazonFeeRate * (1 - returnRate)
  const advertisingCost = sellingPrice * advertisingRate
  const returnLoss = sellingPrice * returnRate

  const grossProfit = sellingPrice - variableCost
  const operatingProfit = netRevenue - variableCost - amazonFee - advertisingCost

  // 利益ゼロになるまで広告に使える上限額。
  const allowableAdCost = netRevenue - variableCost - amazonFee

  const monthlyUnits = Math.max(0, Math.round(safe(input.monthlyUnits)))
  const fixedCost = Math.max(0, safe(input.fixedCost))

  return {
    otherVariableCost: Math.round(otherVariableCost),
    variableCost: Math.round(variableCost),
    amazonFee: Math.round(amazonFee),
    advertisingCost: Math.round(advertisingCost),
    returnLoss: Math.round(returnLoss),
    grossProfit: Math.round(grossProfit),
    grossProfitRate: sellingPrice > 0 ? grossProfit / sellingPrice : 0,
    operatingProfit: Math.round(operatingProfit),
    operatingProfitRate: sellingPrice > 0 ? operatingProfit / sellingPrice : 0,
    profitPerUnit: Math.round(operatingProfit),
    breakEvenUnits: operatingProfit > 0 ? Math.ceil(fixedCost / operatingProfit) : 0,
    allowableAdCost: Math.round(allowableAdCost),
    maxManufacturingCost: reverseCalculateMaxCost({ ...input, targetProfitRate: 0.3 }),
    monthlyRevenue: Math.round(sellingPrice * monthlyUnits),
    monthlyOperatingProfit: Math.round(operatingProfit * monthlyUnits - fixedCost),
  }
}

export type ReverseInput = Omit<CostInput, 'manufacturingCost'> & {
  manufacturingCost?: number
  /** 目標営業利益率(0.3 = 30%) */
  targetProfitRate: number
}

/**
 * 逆算機能(要件40)。
 *
 *   販売価格 → 目標利益率 → 広告費率 → Amazon手数料 → 物流費 → 最大許容製造原価
 *
 * 例: 販売価格5,980円 / 利益率30% → 製造原価1,480円以下
 */
export function reverseCalculateMaxCost(input: ReverseInput): number {
  const sellingPrice = Math.max(0, safe(input.sellingPrice))
  const returnRate = clampRate(input.returnRate)
  const amazonFeeRate = clampRate(input.amazonFeeRate)
  const advertisingRate = clampRate(input.advertisingRate)
  const targetProfitRate = clampRate(input.targetProfitRate)

  const otherVariableCost =
    Math.max(0, safe(input.shipping)) +
    Math.max(0, safe(input.importCost)) +
    Math.max(0, safe(input.tax)) +
    Math.max(0, safe(input.packaging)) +
    Math.max(0, safe(input.fbaFee)) +
    Math.max(0, safe(input.otherCost))

  const netRevenue = sellingPrice * (1 - returnRate)
  const amazonFee = sellingPrice * amazonFeeRate * (1 - returnRate)
  const advertisingCost = sellingPrice * advertisingRate
  const targetProfit = sellingPrice * targetProfitRate

  const max = netRevenue - otherVariableCost - amazonFee - advertisingCost - targetProfit
  return Math.max(0, Math.round(max))
}

/** 目標利益率を満たすために必要な最低販売価格。 */
export function reverseCalculateMinPrice(input: CostInput & { targetProfitRate: number }): number {
  const returnRate = clampRate(input.returnRate)
  const amazonFeeRate = clampRate(input.amazonFeeRate)
  const advertisingRate = clampRate(input.advertisingRate)
  const targetProfitRate = clampRate(input.targetProfitRate)

  const otherVariableCost =
    Math.max(0, safe(input.shipping)) +
    Math.max(0, safe(input.importCost)) +
    Math.max(0, safe(input.tax)) +
    Math.max(0, safe(input.packaging)) +
    Math.max(0, safe(input.fbaFee)) +
    Math.max(0, safe(input.otherCost))

  const variableCost = Math.max(0, safe(input.manufacturingCost)) + otherVariableCost

  // price * [(1-r) - feeRate*(1-r) - adRate - targetRate] = variableCost
  const coefficient = (1 - returnRate) - amazonFeeRate * (1 - returnRate) - advertisingRate - targetProfitRate
  if (coefficient <= 0) return 0
  return Math.ceil(variableCost / coefficient)
}

/** 販売価格を振ったときの利益カーブ。UIのシミュレーションに使う。 */
export function priceSweep(
  input: CostInput,
  range: { from: number; to: number; steps: number },
): { sellingPrice: number; operatingProfit: number; operatingProfitRate: number }[] {
  const steps = Math.max(2, Math.min(60, Math.round(range.steps)))
  const span = range.to - range.from
  return Array.from({ length: steps }, (_, index) => {
    const sellingPrice = Math.round(range.from + (span * index) / (steps - 1))
    const result = calculateCost({ ...input, sellingPrice })
    return {
      sellingPrice,
      operatingProfit: result.operatingProfit,
      operatingProfitRate: result.operatingProfitRate,
    }
  })
}
