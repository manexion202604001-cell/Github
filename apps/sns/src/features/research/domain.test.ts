import { describe, expect, it } from 'vitest'
import { groupByCategory, normalizeInsightType, resolveSourceRefs, toMarkdown, type InsightRecord } from './domain'

function insight(overrides: Partial<InsightRecord> = {}): InsightRecord {
  return {
    id: 'i1',
    category: 'market',
    title: 'タイトル',
    content: '本文',
    insightType: 'INSIGHT',
    confidence: 60,
    sourceIds: [],
    metaJson: null,
    position: 0,
    ...overrides,
  }
}

describe('resolveSourceRefs', () => {
  it('1始まりの番号を出典IDへ変換する', () => {
    expect(resolveSourceRefs([1, 3], ['a', 'b', 'c'])).toEqual(['a', 'c'])
  })

  it('範囲外の番号は捨てる(存在しない出典を作らない)', () => {
    expect(resolveSourceRefs([0, 4, 99], ['a', 'b', 'c'])).toEqual([])
  })

  it('重複は取り除く', () => {
    expect(resolveSourceRefs([1, 1, 2], ['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('normalizeInsightType', () => {
  it('出典のない fact は insight へ格下げする(要件18)', () => {
    expect(normalizeInsightType('fact', [])).toBe('INSIGHT')
  })

  it('出典のある fact はそのまま', () => {
    expect(normalizeInsightType('fact', ['a'])).toBe('FACT')
  })

  it('hypothesis は出典が無くてもそのまま', () => {
    expect(normalizeInsightType('hypothesis', [])).toBe('HYPOTHESIS')
  })
})

describe('groupByCategory', () => {
  it('カテゴリー別に position 順でまとめる', () => {
    const grouped = groupByCategory([
      insight({ id: 'b', category: 'market', position: 2 }),
      insight({ id: 'a', category: 'market', position: 1 }),
      insight({ id: 'c', category: 'customer', position: 3 }),
    ])
    expect(grouped.market?.map((item) => item.id)).toEqual(['a', 'b'])
    expect(grouped.customer?.map((item) => item.id)).toEqual(['c'])
  })
})

describe('toMarkdown', () => {
  it('出典番号と種別ラベルを含めて書き出す', () => {
    const markdown = toMarkdown({
      title: '調査',
      brandName: 'サンプル',
      channelLabel: 'TikTok',
      region: '東京',
      objectiveLabel: 'SNS企画',
      createdAt: new Date('2026-08-28T00:00:00Z'),
      summary: '要約',
      insights: [insight({ insightType: 'FACT', sourceIds: ['s1'] })],
      sources: [
        { id: 's1', title: '出典1', url: 'https://example.com/a', domain: 'example.com', snippet: null, searchQuery: 'q', position: 1 },
      ],
      sectionLabels: [{ key: 'market', label: '市場動向' }],
    })

    expect(markdown).toContain('# 調査')
    expect(markdown).toContain('## 市場動向')
    expect(markdown).toContain('SOURCE FACT [1]')
    expect(markdown).toContain('1. [出典1](https://example.com/a)')
  })
})
