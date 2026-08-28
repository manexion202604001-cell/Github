import { describe, expect, it } from 'vitest'
import { normalizeAxes, overallScore, scoreTone, toCsv, type ScoreAxes } from './domain'

const perfect: ScoreAxes = {
  hook: 100,
  relevance: 100,
  differentiation: 100,
  shareability: 100,
  saveability: 100,
  conversion: 100,
  brandFit: 100,
  feasibility: 100,
  brandSafety: 100,
}

describe('overallScore', () => {
  it('全項目満点なら100', () => {
    expect(overallScore(perfect)).toBe(100)
  })

  it('全項目0なら0', () => {
    expect(overallScore(normalizeAxes({ hook: 0, relevance: 0, differentiation: 0, shareability: 0, saveability: 0, conversion: 0, brandFit: 0, feasibility: 0, brandSafety: 0 }))).toBe(0)
  })

  it('Hookの重みが制作しやすさより大きい', () => {
    const hookHeavy = overallScore({ ...perfect, hook: 0 })
    const feasibilityHeavy = overallScore({ ...perfect, feasibility: 0 })
    expect(hookHeavy).toBeLessThan(feasibilityHeavy)
  })

  it('ブランド安全性が低い企画は上限で抑えられる', () => {
    expect(overallScore({ ...perfect, brandSafety: 40 })).toBeLessThanOrEqual(60)
    expect(overallScore({ ...perfect, brandSafety: 60 })).toBeLessThanOrEqual(80)
  })

  it('結果は常に0〜100に収まる', () => {
    const extreme = overallScore(normalizeAxes({ hook: 500, relevance: -100 }))
    expect(extreme).toBeGreaterThanOrEqual(0)
    expect(extreme).toBeLessThanOrEqual(100)
  })
})

describe('normalizeAxes', () => {
  it('欠損値は既定値で補完する', () => {
    expect(normalizeAxes({}).hook).toBe(60)
  })

  it('範囲外の値は丸める', () => {
    expect(normalizeAxes({ hook: 130 }).hook).toBe(100)
    expect(normalizeAxes({ hook: -30 }).hook).toBe(0)
  })
})

describe('scoreTone', () => {
  it('スコア帯ごとに色調を返す', () => {
    expect(scoreTone(90)).toBe('positive')
    expect(scoreTone(75)).toBe('brand')
    expect(scoreTone(60)).toBe('neutral')
    expect(scoreTone(40)).toBe('warning')
  })
})

describe('toCsv', () => {
  it('BOM付きのCSVを返す', () => {
    const csv = toCsv([{ タイトル: 'テスト', スコア: 90 }])
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('タイトル,スコア')
    expect(csv).toContain('テスト,90')
  })

  it('カンマ・引用符・改行を含む値をエスケープする', () => {
    const csv = toCsv([{ title: 'a,b', hook: 'say "hi"', note: 'line1\nline2' }])
    expect(csv).toContain('"a,b"')
    expect(csv).toContain('"say ""hi"""')
    expect(csv).toContain('"line1\nline2"')
  })

  it('空配列でも壊れない', () => {
    expect(toCsv([])).toBe('\ufeff')
  })
})
