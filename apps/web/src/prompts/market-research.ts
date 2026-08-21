import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { BASE_SYSTEM } from './context'
import type { MarketProduct, MarketSummary } from '@/providers/market-data'

export const marketResearchSchema = z.object({
  summary: z.string(),
  marketSize: z.number().nullable(),
  growthRate: z.number().nullable(),
  competitionScore: z.number().min(0).max(100).nullable(),
  priceStrategy: z.string(),
  opportunities: z.array(z.string()).min(1),
  threats: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  demandTrend: z
    .array(z.object({ period: z.string(), value: z.number() }))
    .default([]),
  snsInsights: z
    .array(z.object({ platform: z.string(), finding: z.string(), implication: z.string() }))
    .default([]),
})

export type MarketResearchOutput = z.infer<typeof marketResearchSchema>

export type MarketResearchInput = {
  keyword: string
  productName: string
  marketplace: string
  sourceLabel: string
  summary: MarketSummary | null
  products: MarketProduct[]
}

/**
 * STEP 3: 取得した市場データをAIが解釈して市場レポートにする(要件21〜24, 28)。
 * 商品タイトル等の外部由来テキストは untrusted として隔離する。
 */
export const marketResearchTask: AITask<MarketResearchInput, MarketResearchOutput> = {
  id: 'market-research',
  system: `${BASE_SYSTEM}

与えられた実データ(商品一覧・価格・レビュー数)から市場レポートを作成してください。

ルール:
- 数値の根拠はデータから導く。データにない数値を断定しない。
- marketSize は円/年の推計。推計不能なら null。
- growthRate は小数(0.12 = 12%)。不明なら null。
- competitionScore は 0(参入しやすい)〜100(激戦)。
- priceStrategy は「実勢価格帯に対してどの価格を狙うべきか」を根拠つきで。
- opportunities は市場の空白地帯を具体的に3〜6個。
- snsInsights はデータがない場合は空配列。`,
  schema: marketResearchSchema,
  maxTokens: 8192,
  buildUser: (input) => {
    const stats = input.summary
      ? `平均価格: ${input.summary.averagePrice ?? '不明'} / 価格帯: ${
          input.summary.priceRange ? `${input.summary.priceRange.min}〜${input.summary.priceRange.max}` : '不明'
        } / 競合強度: ${input.summary.competitionScore ?? '不明'}`
      : 'サマリなし'

    return `## 調査対象
商品: ${input.productName}
キーワード: ${input.keyword}
マーケットプレイス: ${input.marketplace}
データ元: ${input.sourceLabel}

## 集計値
${stats}

## 取得商品数
${input.products.length}件(詳細は untrusted_data ブロック参照)

上記から市場レポートを作成してください。`
  },
  untrusted: (input) => [
    {
      label: 'marketplace-products',
      content: input.products
        .slice(0, 30)
        .map(
          (product, index) =>
            `${index + 1}. ${product.title} | ブランド:${product.brand ?? '-'} | 価格:${product.price ?? '-'} | 評価:${product.rating ?? '-'} | レビュー:${product.reviewCount ?? '-'}`,
        )
        .join('\n'),
    },
  ],
  mock: (input) => ({
    summary: `【サンプル】「${input.keyword}」市場は中価格帯に商品が集中しており、上位はレビュー1,000件超の既存ブランドが占めています。一方で「収納性」と「手入れのしやすさ」を前面に出した商品は少なく、差別化の余地があります。`,
    marketSize: input.summary?.marketSize ?? 180_000_000,
    growthRate: 0.08,
    competitionScore: input.summary?.competitionScore ?? 62,
    priceStrategy:
      '実勢中央値が5,000〜7,000円帯のため、5,980円で「上位機能を中価格帯で」というポジションが取りやすい。3,000円台は価格競争が激しく推奨しない。',
    opportunities: [
      '収納サイズを訴求した商品が上位に存在しない',
      '手入れのしやすさを主要USPにした商品が少ない',
      '静音性能を数値(dB)で明示している商品が上位に1件のみ',
    ],
    threats: ['上位3ブランドがレビュー数で強固', '類似品の低価格帯流入'],
    keywords: [input.keyword, `${input.keyword} コンパクト`, `${input.keyword} 静音`, `${input.keyword} 小型`],
    demandTrend: input.summary?.demandTrend ?? [],
    snsInsights: [
      {
        platform: 'YouTube',
        finding: '同カテゴリのレビュー動画は「開封→実演→掃除方法」の3部構成が定番',
        implication: 'PR動画も同構成にすると視聴維持率が期待できる',
      },
    ],
  }),
}
