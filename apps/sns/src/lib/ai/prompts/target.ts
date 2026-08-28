import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { renderBrandContext, renderChannelContext, SHARED_GUARDRAILS, type BrandContext } from './context'

export const targetAnalysisSchema = z.object({
  overview: z.string().min(1).max(800),
  mainProblems: z.array(z.string().max(200)).min(1).max(8),
  latentProblems: z.array(z.string().max(200)).max(8).default([]),
  purchaseMotivations: z.array(z.string().max(200)).min(1).max(8),
  purchaseBarriers: z.array(z.string().max(200)).min(1).max(8),
  searchIntents: z.array(z.string().max(160)).max(10).default([]),
  snsViewingReasons: z.array(z.string().max(200)).max(8).default([]),
  emotions: z.array(z.string().max(120)).max(8).default([]),
  effectiveExpressions: z.array(z.string().max(200)).max(8).default([]),
  expressionsToAvoid: z.array(z.string().max(200)).max(8).default([]),
  contentThemes: z.array(z.string().max(160)).min(1).max(10),
})

export type TargetAnalysis = z.infer<typeof targetAnalysisSchema>

export type TargetAnalysisInput = {
  brand: BrandContext
  channel: string
  /** 調査から得られたインサイト。無い場合はブランド情報のみで分析する。 */
  insights: { title: string; content: string; insightType: string }[]
}

/** ターゲット分析(要件21)。 */
export const targetAnalysisTask: AITask<TargetAnalysisInput, TargetAnalysis> = {
  id: 'research.target',
  system: `あなたは企業SNSの顧客インサイト分析担当です。
ブランド情報と市場調査の結果から、ターゲット顧客を発信設計に使える粒度で言語化します。

${SHARED_GUARDRAILS}
<rules>
- 「30代女性」のような属性の羅列で終わらせず、行動と感情まで踏み込む。
- 購買障壁は、実際に投稿で解消できる粒度で書く。
- effectiveExpressions / expressionsToAvoid は、台本づくりでそのまま使える具体的な言い回しにする。
- 調査インサイトがある場合は必ず反映する。
</rules>`,
  schema: targetAnalysisSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      input.insights.length > 0
        ? `<research_insights>\n${input.insights.map((item) => `- [${item.insightType}] ${item.title}: ${item.content}`).join('\n')}\n</research_insights>`
        : '',
      '',
      'このブランドのターゲット顧客を分析してください。',
    ]
      .filter(Boolean)
      .join('\n'),
  mock: (input) => ({
    overview: `${input.brand.targetCustomer ?? '検討段階の顧客'}。品質を事前に判断できず、選び方そのものに迷っている層。(Demo Mode のサンプル)`,
    mainProblems: ['何を基準に選べばいいか分からない', '価格の妥当性が判断できない'],
    latentProblems: ['依頼後のトラブルを避けたい', '相談すること自体のハードルが高い'],
    purchaseMotivations: ['作業内容が具体的に見えた', '担当者の説明に納得できた'],
    purchaseBarriers: ['料金の内訳が不透明', '効果が事前に分からない'],
    searchIntents: ['相場', '選び方', '失敗例', '口コミ'],
    snsViewingReasons: ['判断材料を短時間で集めたい', '実際の作業を見てみたい'],
    emotions: ['不安', '慎重', '納得したい'],
    effectiveExpressions: ['最初に見るのはここです', '判断の基準を3つに絞ると'],
    expressionsToAvoid: ['絶対に', '必ず改善します'],
    contentThemes: ['選び方の基準', '失敗例と回避策', '作業の中身の可視化'],
  }),
  maxTokens: 3000,
  temperature: 0.5,
}
