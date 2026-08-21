import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COST_INPUT,
  calculateCost,
  priceSweep,
  reverseCalculateMaxCost,
  reverseCalculateMinPrice,
} from '../domain'

describe('calculateCost', () => {
  it('粗利は販売価格から変動費を引いた額になる', () => {
    const result = calculateCost({
      ...DEFAULT_COST_INPUT,
      sellingPrice: 5980,
      manufacturingCost: 1480,
      shipping: 220,
      importCost: 120,
      tax: 0,
      packaging: 80,
      fbaFee: 434,
      otherCost: 0,
    })
    // 変動費 = 1480 + 220 + 120 + 0 + 80 + 434 = 2334
    expect(result.variableCost).toBe(2334)
    expect(result.grossProfit).toBe(5980 - 2334)
    expect(result.grossProfitRate).toBeCloseTo((5980 - 2334) / 5980, 5)
  })

  it('返品率0・広告0・手数料0なら営業利益は粗利と一致する', () => {
    const result = calculateCost({
      ...DEFAULT_COST_INPUT,
      returnRate: 0,
      advertisingRate: 0,
      amazonFeeRate: 0,
    })
    expect(result.operatingProfit).toBe(result.grossProfit)
  })

  it('広告費率を上げると営業利益が減る', () => {
    const low = calculateCost({ ...DEFAULT_COST_INPUT, advertisingRate: 0.05 })
    const high = calculateCost({ ...DEFAULT_COST_INPUT, advertisingRate: 0.2 })
    expect(high.operatingProfit).toBeLessThan(low.operatingProfit)
  })

  it('損益分岐点は固定費 ÷ 1個あたり営業利益の切り上げ', () => {
    const result = calculateCost({ ...DEFAULT_COST_INPUT, fixedCost: 300_000 })
    expect(result.breakEvenUnits).toBe(Math.ceil(300_000 / result.operatingProfit))
  })

  it('営業利益が0以下なら損益分岐点は0を返す(無限大を出さない)', () => {
    const result = calculateCost({ ...DEFAULT_COST_INPUT, manufacturingCost: 99_999, fixedCost: 100_000 })
    expect(result.operatingProfit).toBeLessThanOrEqual(0)
    expect(result.breakEvenUnits).toBe(0)
  })

  it('不正な数値でもNaNを返さない', () => {
    const result = calculateCost({
      ...DEFAULT_COST_INPUT,
      sellingPrice: Number.NaN,
      manufacturingCost: -500,
      returnRate: 5,
    })
    for (const value of Object.values(result)) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })
})

describe('reverseCalculateMaxCost', () => {
  it('要件40の例: 販売価格5,980円・利益率30%で製造原価上限が算出される', () => {
    const max = reverseCalculateMaxCost({
      ...DEFAULT_COST_INPUT,
      sellingPrice: 5980,
      targetProfitRate: 0.3,
    })
    // 上限原価で作れば、目標利益率をほぼ満たす
    const check = calculateCost({ ...DEFAULT_COST_INPUT, sellingPrice: 5980, manufacturingCost: max })
    expect(check.operatingProfitRate).toBeGreaterThanOrEqual(0.29)
    expect(max).toBeGreaterThan(0)
  })

  it('目標利益率を上げると許容原価は下がる', () => {
    const at20 = reverseCalculateMaxCost({ ...DEFAULT_COST_INPUT, targetProfitRate: 0.2 })
    const at40 = reverseCalculateMaxCost({ ...DEFAULT_COST_INPUT, targetProfitRate: 0.4 })
    expect(at40).toBeLessThan(at20)
  })

  it('達成不能な条件では0を返す(負の原価を返さない)', () => {
    const max = reverseCalculateMaxCost({ ...DEFAULT_COST_INPUT, sellingPrice: 500, targetProfitRate: 0.9 })
    expect(max).toBe(0)
  })
})

describe('reverseCalculateMinPrice', () => {
  it('算出された価格で目標利益率を満たす', () => {
    const price = reverseCalculateMinPrice({ ...DEFAULT_COST_INPUT, targetProfitRate: 0.25 })
    const result = calculateCost({ ...DEFAULT_COST_INPUT, sellingPrice: price })
    expect(result.operatingProfitRate).toBeGreaterThanOrEqual(0.25)
  })

  it('係数が0以下になる条件では0を返す', () => {
    const price = reverseCalculateMinPrice({ ...DEFAULT_COST_INPUT, advertisingRate: 0.6, targetProfitRate: 0.5 })
    expect(price).toBe(0)
  })
})

describe('priceSweep', () => {
  it('指定した点数だけ返し、価格が単調増加する', () => {
    const points = priceSweep(DEFAULT_COST_INPUT, { from: 3000, to: 9000, steps: 7 })
    expect(points).toHaveLength(7)
    expect(points[0]?.sellingPrice).toBe(3000)
    expect(points.at(-1)?.sellingPrice).toBe(9000)
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index]!.sellingPrice).toBeGreaterThan(points[index - 1]!.sellingPrice)
    }
  })
})
