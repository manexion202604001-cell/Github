import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { BASE_SYSTEM } from './context'
import type { MarketReview } from '@/providers/market-data'

const SENTIMENTS = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'IMPROVEMENT_REQUEST', 'RETURN_REASON', 'PURCHASE_REASON'] as const

export const reviewAnalysisSchema = z.object({
  clusters: z
    .array(
      z.object({
        sentiment: z.enum(SENTIMENTS),
        cluster: z.string(),
        summary: z.string(),
        share: z.number().min(0).max(1),
        count: z.number().int().min(0),
        keywords: z.array(z.string()).default([]),
        examples: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  topComplaints: z.array(z.object({ label: z.string(), share: z.number().min(0).max(1) })).default([]),
  purchaseReasons: z.array(z.string()).default([]),
  returnReasons: z.array(z.string()).default([]),
  productImplications: z.array(z.string()).min(1),
})

export type ReviewAnalysisOutput = z.infer<typeof reviewAnalysisSchema>

export type ReviewAnalysisInput = {
  productName: string
  reviews: MarketReview[]
}

/**
 * STEP 3: 競合レビューを分類し「市場の不満」をランキング化する(要件26, 27)。
 * レビュー本文は第三者が書いた外部データなので必ず untrusted として渡す。
 */
export const reviewAnalysisTask: AITask<ReviewAnalysisInput, ReviewAnalysisOutput> = {
  id: 'review-analysis',
  system: `${BASE_SYSTEM}

競合商品のレビューを分析し、市場の不満をクラスタリングしてください。

ルール:
- cluster は「掃除しづらい」「音がうるさい」のような短い日本語ラベル。
- share は全レビューに対する割合(0〜1)。クラスタ全体の合計が1.2を超えないようにする。
- topComplaints は NEGATIVE / IMPROVEMENT_REQUEST のクラスタを share 降順で並べたもの。
- examples はレビュー本文の短い引用(30字以内)を最大2件。
- productImplications は「この不満に対して自社商品はどう作るべきか」を具体的に3〜6個。`,
  schema: reviewAnalysisSchema,
  maxTokens: 8192,
  buildUser: (input) =>
    `## 対象\n${input.productName} の競合レビュー ${input.reviews.length}件\n\nuntrusted_data ブロックのレビューを分析してください。`,
  untrusted: (input) => [
    {
      label: 'competitor-reviews',
      content: input.reviews
        .slice(0, 120)
        .map((review, index) => `${index + 1}. [${review.rating ?? '-'}星] ${review.body.slice(0, 300)}`)
        .join('\n'),
    },
  ],
  mock: () => ({
    clusters: [
      {
        sentiment: 'NEGATIVE' as const,
        cluster: '掃除しづらい',
        summary: '分解できず内部に汚れが残るという不満が最多。衛生面の懸念につながっている。',
        share: 0.36,
        count: 43,
        keywords: ['掃除', '分解', '衛生'],
        examples: ['分解して洗えないので衛生面が心配'],
      },
      {
        sentiment: 'NEGATIVE' as const,
        cluster: '音がうるさい',
        summary: '動作音が想定より大きく、夜間や在宅ワーク中の使用をためらう声。',
        share: 0.25,
        count: 30,
        keywords: ['音', '静音', '夜'],
        examples: ['思ったより動作音が大きい'],
      },
      {
        sentiment: 'NEGATIVE' as const,
        cluster: '大きい',
        summary: '設置スペースを取り、収納に困るという指摘。',
        share: 0.18,
        count: 22,
        keywords: ['大きい', '場所', '収納'],
        examples: ['本体が大きすぎて置き場所に困った'],
      },
      {
        sentiment: 'IMPROVEMENT_REQUEST' as const,
        cluster: '収納しづらい',
        summary: 'コードや付属品の収納場所がなく、片付けにくい。',
        share: 0.13,
        count: 16,
        keywords: ['収納', 'コード'],
        examples: [],
      },
      {
        sentiment: 'PURCHASE_REASON' as const,
        cluster: 'ギフト需要',
        summary: '贈答用として購入する層が一定数存在し、梱包の質が評価に影響している。',
        share: 0.12,
        count: 14,
        keywords: ['ギフト', '梱包', 'プレゼント'],
        examples: ['ギフト用に購入。梱包が丁寧だった'],
      },
      {
        sentiment: 'RETURN_REASON' as const,
        cluster: '初期不良・耐久性',
        summary: '数ヶ月で動作しなくなる個体があり、返品理由の中心。',
        share: 0.08,
        count: 10,
        keywords: ['故障', '返品', '耐久'],
        examples: ['2ヶ月で電源が入らなくなった'],
      },
    ],
    topComplaints: [
      { label: '掃除しづらい', share: 0.36 },
      { label: '音がうるさい', share: 0.25 },
      { label: '大きい', share: 0.18 },
      { label: '収納しづらい', share: 0.13 },
    ],
    purchaseReasons: ['サイズが置き場所に合った', 'ギフトとして見栄えがする', '価格が手頃'],
    returnReasons: ['短期間での故障', 'サイズが想定と違った'],
    productImplications: [
      '分解して丸洗いできる構造を必須要件にする',
      '運転音を50dB以下に抑え、パッケージとLPで数値を明示する',
      '収納時サイズを競合比で小さくし、商品画像で比較を見せる',
      '付属品の収納スペースを本体に設ける',
    ],
  }),
}
