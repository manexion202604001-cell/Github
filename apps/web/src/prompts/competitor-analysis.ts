import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { BASE_SYSTEM } from './context'
import type { MarketProduct } from '@/providers/market-data'

export const competitorAnalysisSchema = z.object({
  competitors: z
    .array(
      z.object({
        externalId: z.string(),
        brand: z.string().nullable(),
        usp: z.string(),
        strengths: z.array(z.string()).default([]),
        weaknesses: z.array(z.string()).default([]),
        priceTier: z.enum(['LOW', 'MID', 'HIGH']),
      }),
    )
    .default([]),
  landscape: z.string(),
  whiteSpaces: z.array(z.string()).min(1),
  benchmarkPrice: z.number().nullable(),
})

export type CompetitorAnalysisOutput = z.infer<typeof competitorAnalysisSchema>

export type CompetitorAnalysisInput = {
  productName: string
  targetPrice: number | null
  products: MarketProduct[]
}

/** 競合商品を比較し、USPと空白地帯を抽出する(要件25)。 */
export const competitorAnalysisTask: AITask<CompetitorAnalysisInput, CompetitorAnalysisOutput> = {
  id: 'competitor-analysis',
  system: `${BASE_SYSTEM}

競合商品の一覧から、各商品のUSPと強み・弱みを推定し、市場の空白地帯を特定してください。

ルール:
- externalId は入力に含まれるIDをそのまま使う(創作しない)。
- priceTier は入力商品群の価格分布に対する相対位置で判定する。
- weaknesses はタイトル・価格・レビュー数から合理的に推測できる範囲に留める。
- whiteSpaces は「まだ誰も取っていない訴求」を3〜6個。`,
  schema: competitorAnalysisSchema,
  maxTokens: 8192,
  buildUser: (input) =>
    `## 自社商品\n${input.productName}\n想定価格: ${input.targetPrice ?? '未定'}\n\n## 競合商品\nuntrusted_data ブロックの一覧を分析してください(${input.products.length}件)。`,
  untrusted: (input) => [
    {
      label: 'competitor-products',
      content: input.products
        .slice(0, 30)
        .map(
          (product) =>
            `id=${product.externalId} | ${product.title} | ブランド:${product.brand ?? '-'} | 価格:${product.price ?? '-'} | 評価:${product.rating ?? '-'}(${product.reviewCount ?? 0}件) | 特徴:${product.features.slice(0, 3).join(',')}`,
        )
        .join('\n'),
    },
  ],
  mock: (input) => ({
    competitors: input.products.slice(0, 10).map((product, index) => ({
      externalId: product.externalId,
      brand: product.brand ?? null,
      usp: index % 2 === 0 ? '大容量と価格の安さで支持されている' : 'デザイン性と静音性を訴求している',
      strengths: ['レビュー数が多く信頼性が高い', '価格が実勢中央値に近い'],
      weaknesses: ['本体サイズが大きい', '手入れの手間に関する不満が想定される'],
      priceTier: (product.price ?? 0) > 8000 ? ('HIGH' as const) : (product.price ?? 0) > 4000 ? ('MID' as const) : ('LOW' as const),
    })),
    landscape:
      '【サンプル】上位は大容量・低価格帯のブランドが占め、中価格帯はデザイン訴求の商品が並ぶ。省スペース性を主軸にした商品は上位に見られない。',
    whiteSpaces: ['収納時サイズの明示', '分解洗浄に対応した構造', '運転音のdB表記', '2年保証などの安心訴求'],
    benchmarkPrice: input.targetPrice ?? 5980,
  }),
}
