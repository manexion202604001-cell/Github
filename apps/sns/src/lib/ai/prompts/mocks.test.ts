import { describe, expect, it } from 'vitest'
import type { AITask } from '@/lib/ai/task'
import type { BrandContext } from './context'
import { renderBrandContext, renderChannelContext } from './context'
import { researchPlanTask, researchReportTask } from './research'
import { targetAnalysisTask } from './target'
import { ideaGenerationTask } from './ideas'
import { ideaScoreTask } from './scores'
import { hookGenerationTask } from './hooks'
import { scriptGenerationTask, scriptRefineTask } from './scripts'
import { productionBriefTask } from './production'
import { videoPromptTask } from './video-prompt'
import { captionTask } from './captions'
import { brandCheckTask } from './brand-check'

const brand: BrandContext = {
  name: 'サンプルクリーン',
  industry: 'エアコンクリーニング',
  website: 'https://example.com',
  region: '東京都内',
  description: '家庭向けの分解洗浄',
  targetCustomer: '30〜50代ファミリー',
  brandTone: '誠実',
  snsChannels: ['instagram_reels'],
  snsGoals: ['inquiry'],
  brandKeywords: ['エアコン'],
  additionalContext: null,
  products: [
    {
      name: '分解洗浄',
      description: '内部まで洗浄',
      priceRange: '12,000円〜',
      strengths: ['写真を共有'],
      weaknesses: ['繁忙期は混む'],
      differentiation: '判断基準を説明する',
      customerProblems: ['効果が分からない'],
      customerNeeds: ['安心したい'],
      purchaseReasons: ['説明に納得'],
    },
  ],
  competitors: [{ name: 'デモ競合A社', website: 'https://example.com/a', notes: '価格訴求中心' }],
  rules: {
    prohibitedWords: ['絶対に'],
    preferredWords: ['判断の基準'],
    tone: '誠実',
    allowCompetitorNames: false,
    avoidExpressions: ['煽り'],
    legalNotes: null,
    regulatoryNotes: '断定的な表現は避ける',
    internalRules: null,
    preferredCta: 'プロフィールから相談できます',
  },
}

const sources = [
  { index: 1, title: '出典1', url: 'https://example.com/1', domain: 'example.com', snippet: '抜粋', query: 'q1' },
  { index: 2, title: '出典2', url: 'https://example.com/2', domain: 'example.com', snippet: '抜粋', query: 'q2' },
]

const plan = {
  researchQuestions: ['q1', 'q2', 'q3'],
  searchQueries: ['s1', 's2'],
  competitorQueries: ['c1'],
  customerQueries: ['u1'],
  trendQueries: ['t1'],
}

const scenes = [
  { position: 1, startSecond: 0, endSecond: 4, visual: '汚れのアップ', voice: 'この汚れ、見えますか？', camera: 'マクロ', assets: ['対象物'] },
  { position: 2, startSecond: 4, endSecond: 12, visual: '説明カット', voice: '確認は3か所です', camera: '手持ち', assets: ['話者'] },
]

/**
 * Demo Mode の生命線(要件99)。
 * 各AITaskの mock が、そのタスク自身の zod スキーマを満たすことを保証する。
 * スキーマだけ変えて mock を直し忘れると、APIキー無しの環境で機能が壊れるため。
 */
const cases: { task: AITask<never, unknown>; input: unknown }[] = [
  { task: researchPlanTask as never, input: { brand, channel: 'instagram_reels', region: '東京', objective: 'sns_plan', depth: 'STANDARD', keywords: ['エアコン'], freeText: null } },
  { task: researchReportTask as never, input: { brand, channel: 'instagram_reels', region: '東京', objective: 'sns_plan', depth: 'STANDARD', plan, freeText: null, sources, searchFailures: [] } },
  { task: targetAnalysisTask as never, input: { brand, channel: 'instagram_reels', insights: [{ title: 't', content: 'c', insightType: 'insight' }] } },
  { task: ideaGenerationTask as never, input: { brand, channel: 'instagram_reels', count: 20, goals: ['inquiry'], insights: [{ index: 1, category: 'overview', title: 't', content: 'c', insightType: 'insight' }], opportunities: ['o1'] } },
  { task: ideaScoreTask as never, input: { brand, channel: 'instagram_reels', ideas: [{ index: 1, title: 't', category: 'faq', hook: 'h', summary: 's', difficulty: 'LOW' }] } },
  { task: hookGenerationTask as never, input: { brand, channel: 'instagram_reels', idea: { title: 't', category: 'faq', summary: 's', target: null } } },
  { task: scriptGenerationTask as never, input: { brand, channel: 'instagram_reels', durationSec: 30, style: 'face_to_camera', tone: 'friendly', hook: 'h', idea: { title: 't', category: 'faq', summary: 's', whyThisIdea: 'w', target: null, cta: null }, insights: [] } },
  { task: scriptRefineTask as never, input: { brand, channel: 'instagram_reels', instruction: 'もっと短く', targetDurationSec: 15, current: { title: 't', hook: 'h', cta: null, scenes: [{ startSecond: 0, endSecond: 4, visual: 'v', voice: 'a', onscreenText: null, camera: null, purpose: null }] } } },
  { task: productionBriefTask as never, input: { brand, style: 'face_to_camera', script: { title: 't', durationSec: 30, scenes: scenes.map((scene) => ({ ...scene, onscreenText: null })) } } },
  { task: videoPromptTask as never, input: { brand, channel: 'instagram_reels', preset: 'veo', language: 'en', script: { title: 't', tone: 'friendly', scenes } } },
  { task: captionTask as never, input: { brand, channel: 'instagram_reels', script: { title: 't', hook: 'h', cta: null, scenes: [{ voice: 'a' }] } } },
  { task: brandCheckTask as never, input: { brand, script: { title: 't', hook: '絶対に落ちます', cta: null, scenes: [{ voice: '絶対に落ちます', onscreenText: null }] } } },
]

describe('AITask の mock は自身のスキーマを満たす', () => {
  for (const { task, input } of cases) {
    it(task.id, () => {
      const mock = task.mock(input as never)
      const parsed = task.schema.safeParse(mock)
      if (!parsed.success) {
        throw new Error(`${task.id}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' / ')}`)
      }
      expect(parsed.success).toBe(true)
    })
  }
})

describe('AITask の buildUser はブランド文脈を含む', () => {
  for (const { task, input } of cases) {
    it(task.id, () => {
      const prompt = task.buildUser(input as never)
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt).toContain('サンプルクリーン')
    })
  }
})

describe('企画生成の mock は指定件数を返す', () => {
  it('count=30 なら30件', () => {
    const result = ideaGenerationTask.mock({
      brand,
      channel: 'instagram_reels',
      count: 30,
      goals: ['inquiry'],
      insights: [],
      opportunities: [],
    })
    expect(result.ideas).toHaveLength(30)
    // 同じ企画の重複を量産しない(要件96)。
    expect(new Set(result.ideas.map((idea) => idea.title)).size).toBe(30)
  })
})

describe('ブランドチェックの mock は禁止ワードを検出する', () => {
  it('禁止ワードを含む台本は WARNING', () => {
    const result = brandCheckTask.mock({
      brand,
      script: { title: 't', hook: '絶対に落ちます', cta: null, scenes: [{ voice: '絶対に落ちます', onscreenText: null }] },
    })
    expect(result.verdict).toBe('WARNING')
    expect(result.findings.length).toBeGreaterThan(0)
  })

  it('禁止ワードが無ければ SAFE', () => {
    const result = brandCheckTask.mock({
      brand,
      script: { title: 't', hook: '判断の基準を3つに絞ります', cta: null, scenes: [{ voice: '確認は3か所です', onscreenText: null }] },
    })
    expect(result.verdict).toBe('SAFE')
    expect(result.findings).toHaveLength(0)
  })
})

describe('プロンプト文脈のレンダリング', () => {
  it('ブランド文脈にルールと商品が含まれる', () => {
    const rendered = renderBrandContext(brand)
    expect(rendered).toContain('<brand_context>')
    expect(rendered).toContain('分解洗浄')
    expect(rendered).toContain('禁止ワード: 絶対に')
    expect(rendered).toContain('競合名の言及: 不可')
  })

  it('チャネル文脈に尺と画角が含まれる', () => {
    const rendered = renderChannelContext('instagram_reels')
    expect(rendered).toContain('Instagram Reels')
    expect(rendered).toContain('9:16')
  })

  it('未知のチャネルは空文字を返す', () => {
    expect(renderChannelContext('unknown')).toBe('')
  })
})
