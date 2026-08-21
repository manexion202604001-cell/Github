import { describe, expect, it } from 'vitest'
import { calculateCompleteness, canStartMarketResearch, missingFields } from '../domain'

const empty = {
  name: null,
  category: null,
  description: null,
  purpose: null,
  problem: null,
  target: null,
  price: null,
  country: null,
  channel: null,
  features: [],
  usp: [],
}

describe('calculateCompleteness', () => {
  it('全項目未入力なら0', () => {
    expect(calculateCompleteness(empty)).toBe(0)
  })

  it('全項目入力なら1', () => {
    expect(
      calculateCompleteness({
        name: '商品',
        category: '家電',
        description: '説明',
        purpose: '目的',
        problem: '課題',
        target: '対象',
        price: 5980,
        country: '日本',
        channel: 'Amazon',
        features: ['A'],
        usp: ['B'],
      }),
    ).toBe(1)
  })

  it('価格0や空白文字は未入力として扱う', () => {
    const result = calculateCompleteness({ ...empty, name: '   ', price: 0 })
    expect(result).toBe(0)
  })

  it('未入力項目を列挙できる', () => {
    const missing = missingFields({ ...empty, name: '商品', price: 100 })
    expect(missing).not.toContain('name')
    expect(missing).not.toContain('price')
    expect(missing).toContain('category')
  })
})

describe('canStartMarketResearch', () => {
  it('商品名とカテゴリがあれば開始できる', () => {
    expect(canStartMarketResearch({ ...empty, name: '商品', category: '家電' })).toBe(true)
  })

  it('商品名だけでは開始できない', () => {
    expect(canStartMarketResearch({ ...empty, name: '商品' })).toBe(false)
  })
})
