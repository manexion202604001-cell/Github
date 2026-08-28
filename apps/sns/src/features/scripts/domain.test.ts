import { describe, expect, it } from 'vitest'
import { normalizeTimeline, reindex, toMarkdown, totalDuration } from './domain'

describe('normalizeTimeline', () => {
  it('最初のシーンは0秒から始まる', () => {
    const scenes = normalizeTimeline([{ startSecond: 3, endSecond: 8 }], 30)
    expect(scenes[0]?.startSecond).toBe(0)
  })

  it('最後のシーンの終端は指定尺に一致する(要件97)', () => {
    const scenes = normalizeTimeline(
      [
        { startSecond: 0, endSecond: 3 },
        { startSecond: 3, endSecond: 10 },
        { startSecond: 10, endSecond: 18 },
      ],
      30,
    )
    expect(scenes[scenes.length - 1]?.endSecond).toBe(30)
  })

  it('指定尺を超えるシーンは切り詰められる', () => {
    const scenes = normalizeTimeline(
      [
        { startSecond: 0, endSecond: 40 },
        { startSecond: 40, endSecond: 80 },
      ],
      30,
    )
    expect(scenes.every((scene) => scene.endSecond <= 30)).toBe(true)
  })

  it('シーンは隙間なく連続する', () => {
    const scenes = normalizeTimeline(
      [
        { startSecond: 0, endSecond: 4 },
        { startSecond: 6, endSecond: 12 },
        { startSecond: 12, endSecond: 15 },
      ],
      30,
    )
    for (let index = 1; index < scenes.length; index += 1) {
      expect(scenes[index]?.startSecond).toBe(scenes[index - 1]?.endSecond)
    }
  })

  it('空配列はそのまま返す', () => {
    expect(normalizeTimeline([], 30)).toEqual([])
  })
})

describe('totalDuration', () => {
  it('最大の終端を返す', () => {
    expect(totalDuration([{ startSecond: 0, endSecond: 5 }, { startSecond: 5, endSecond: 20 }])).toBe(20)
  })
})

describe('reindex', () => {
  it('0始まりで振り直す', () => {
    expect(reindex([{ id: 'a' }, { id: 'b' }])).toEqual([
      { id: 'a', position: 0 },
      { id: 'b', position: 1 },
    ])
  })
})

describe('toMarkdown', () => {
  it('シーン単位の見出しと各項目を書き出す', () => {
    const markdown = toMarkdown({
      title: 'テスト台本',
      brandName: 'サンプル',
      channelLabel: 'TikTok',
      durationSec: 30,
      styleLabel: 'Face To Camera',
      toneLabel: 'Friendly',
      hook: 'この汚れ、見えますか？',
      cta: 'プロフィールへ',
      scenes: [
        {
          position: 0,
          startSecond: 0,
          endSecond: 3,
          visual: '汚れのアップ',
          voice: 'この汚れ、見えますか？',
          onscreenText: '3年間放置',
          camera: 'マクロ',
          assets: ['対象物'],
          purpose: 'Hook',
        },
      ],
    })

    expect(markdown).toContain('# テスト台本')
    expect(markdown).toContain('## Scene 1 — 0〜3秒 [Hook]')
    expect(markdown).toContain('- VISUAL: 汚れのアップ')
    expect(markdown).toContain('- TEXT: 3年間放置')
  })
})
