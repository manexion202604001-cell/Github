import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const productScoreSchema = z.object({
  marketDemand: z.number().int().min(0).max(15),
  competition: z.number().int().min(0).max(15),
  differentiation: z.number().int().min(0).max(15),
  profitability: z.number().int().min(0).max(15),
  logistics: z.number().int().min(0).max(10),
  advertising: z.number().int().min(0).max(10),
  reviewOpportunity: z.number().int().min(0).max(10),
  expandability: z.number().int().min(0).max(5),
  risk: z.number().int().min(0).max(5),
  decision: z.enum(['GO', 'IMPROVE_GO', 'NO_GO']),
  reason: z.string(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  improvements: z
    .array(z.object({ item: z.string(), current: z.string(), recommended: z.string(), reason: z.string() }))
    .default([]),
  alternativeIdeas: z.array(z.object({ name: z.string(), reason: z.string() })).default([]),
})

export type ProductScoreOutput = z.infer<typeof productScoreSchema>

/**
 * STEP 4: 100点満点で商品を評価し GO / IMPROVE_GO / NO_GO を返す(要件29〜34)。
 * 配点の上限をスキーマで固定し、合計は必ず100点になる。
 */
export const productScoreTask: AITask<{ context: ProjectContextSnapshot }, ProductScoreOutput> = {
  id: 'product-score',
  system: `${BASE_SYSTEM}

市場データと商品情報から、商品を100点満点で評価してください。

配点(各項目の最大点):
- marketDemand 市場需要: 15
- competition 競合強度(競合が弱いほど高得点): 15
- differentiation 差別化余地: 15
- profitability 利益性: 15
- logistics 物流適性: 10
- advertising 広告適性: 10
- reviewOpportunity レビュー改善余地: 10
- expandability シリーズ展開性: 5
- risk 規制リスクの低さ(リスクが低いほど高得点): 5

判定基準:
- 合計70点以上 → GO
- 合計50〜69点 → IMPROVE_GO(improvements を必ず3件以上出す)
- 合計49点以下 → NO_GO(reason で理由を明示し、alternativeIdeas を必ず2件以上出す)

improvements は「現状 → AI推奨 → 理由」の形式で、レビュー分析の不満に紐づけて具体的な数値で提案すること。`,
  schema: productScoreSchema,
  maxTokens: 6144,
  buildUser: (input) =>
    `${formatProjectContext(input.context)}\n\n上記データに基づいて商品を評価してください。データが不足している項目は保守的(低め)に採点し、reason で不足を明記してください。`,
  mock: (input) => {
    const hasMarket = input.context.market !== null
    const hasReviews = input.context.reviewClusters.length > 0
    return {
      marketDemand: hasMarket ? 11 : 7,
      competition: 8,
      differentiation: hasReviews ? 12 : 8,
      profitability: input.context.cost ? 11 : 8,
      logistics: 7,
      advertising: 7,
      reviewOpportunity: hasReviews ? 8 : 5,
      expandability: 3,
      risk: 3,
      decision: 'IMPROVE_GO' as const,
      reason:
        '【サンプル】市場needsは確認できるものの、現状の仕様では競合との差別化が弱く、利益率も目標に届いていません。サイズと構造を見直すことで開発可能な水準に到達します。',
      strengths: ['市場の不満が明確で改善余地が大きい', '中価格帯にポジションを取りやすい'],
      weaknesses: ['現状仕様では競合との違いが伝わりにくい', '製造原価の見積もりが未確定'],
      improvements: [
        {
          item: '容量',
          current: '5L',
          recommended: '3.5L',
          reason: '購入者レビューで「大きすぎる」という不満が18%を占めるため、設置性を優先する。',
        },
        {
          item: '構造',
          current: '一体型',
          recommended: '分解洗浄可能な2ピース構造',
          reason: '最多の不満「掃除しづらい」(36%)を直接解消できる。',
        },
        {
          item: '運転音',
          current: '未定',
          recommended: '50dB以下',
          reason: '「音がうるさい」(25%)への対応。数値表記が競合との差別化にもなる。',
        },
      ],
      alternativeIdeas: [],
    }
  },
}
