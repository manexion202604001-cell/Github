import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { renderBrandContext, renderChannelContext, SHARED_GUARDRAILS, type BrandContext } from './context'

const axis = z.number().int().min(0).max(100)

export const ideaScoreItemSchema = z.object({
  index: z.number().int().min(1),
  hook: axis,
  relevance: axis,
  differentiation: axis,
  shareability: axis,
  saveability: axis,
  conversion: axis,
  brandFit: axis,
  feasibility: axis,
  brandSafety: axis,
  reasoning: z.string().min(1).max(500),
})

export const ideaScoreListSchema = z.object({
  scores: z.array(ideaScoreItemSchema).min(1).max(30),
})

export type IdeaScoreItem = z.infer<typeof ideaScoreItemSchema>
export type IdeaScoreList = z.infer<typeof ideaScoreListSchema>

export type IdeaScoreInput = {
  brand: BrandContext
  channel: string
  ideas: { index: number; title: string; category: string; hook: string; summary: string; difficulty: string }[]
}

/**
 * 企画のAI推定評価(要件25)。
 * 「バズ確率」等の断定表現は使わず、あくまで比較のための推定値として扱う。
 */
export const ideaScoreTask: AITask<IdeaScoreInput, IdeaScoreList> = {
  id: 'ideas.score',
  system: `あなたは Short Form Content の評価担当です。
提示された企画を9つの観点で評価します。これは「AI推定評価」であり、成果の予測ではありません。

${SHARED_GUARDRAILS}
<rules>
- 各観点0〜100で評価する。全企画を同じ基準で相対評価する。
- 全部を高得点にしない。差がつくように評価する。
- reasoning には、点数の根拠を1〜2文で書く。抽象的な褒め言葉にしない。
- brandSafety は、誇大表現・法的リスク・ブランド毀損の観点で減点する。
- feasibility は撮影の現実性(必要な人・場所・素材)で評価する。
- 「バズる」「拡散が保証される」といった断定はしない。
</rules>`,
  schema: ideaScoreListSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      '<ideas>',
      input.ideas
        .map((idea) => `[${idea.index}] ${idea.title}\n  カテゴリー: ${idea.category} / 難易度: ${idea.difficulty}\n  Hook: ${idea.hook}\n  概要: ${idea.summary}`)
        .join('\n'),
      '</ideas>',
      '',
      'すべての企画を評価してください。index は提示した番号をそのまま使ってください。',
    ].join('\n'),
  mock: (input) => ({
    scores: input.ideas.map((idea) => {
      // Demo Mode でも企画ごとに差が出るよう、タイトルから決定的に散らす。
      const seed = [...idea.title].reduce((sum, char) => sum + char.charCodeAt(0), 0)
      const vary = (base: number, offset: number) => Math.max(55, Math.min(97, base + ((seed + offset) % 13) - 6))
      return {
        index: idea.index,
        hook: vary(86, 1),
        relevance: vary(84, 2),
        differentiation: vary(80, 3),
        shareability: vary(78, 4),
        saveability: vary(83, 5),
        conversion: vary(75, 6),
        brandFit: vary(88, 7),
        feasibility: idea.difficulty === 'LOW' ? vary(90, 8) : vary(74, 8),
        brandSafety: vary(92, 9),
        reasoning: '判断基準を示す構成でHookが具体的。制作難易度も現実的。(Demo Mode のサンプル評価)',
      }
    }),
  }),
  maxTokens: 10_000,
  temperature: 0.3,
}
