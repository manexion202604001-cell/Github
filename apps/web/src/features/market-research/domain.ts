import type { ResearchDepth } from '@prisma/client'
import type { MarketProduct } from '@/providers/market-data'
import type { CompetitorAnalysisOutput } from '@/prompts/competitor-analysis'

/**
 * 市場調査の深度設定(要件28拡張)。
 * 「簡易」は取得件数とAI呼び出しを絞って速度を優先し、
 * 「詳細」は網羅性を優先してレビュー解析まで自動で連結する。
 */
export type DepthConfig = {
  label: string
  description: string
  /** ECサイト1ソースあたりの取得件数上限。 */
  perSourceLimit: number
  /** AIに渡す商品数上限(untrusted_dataに含める件数)。多いほど遅く・不安定になりやすい。 */
  aiProductCap: number
  /** 競合分析AI(competitor-analysis)を呼ぶか。簡易では呼ばずヒューリスティックで代替し高速化する。 */
  runCompetitorAnalysis: boolean
  /** 調査完了後、レビュー解析まで自動で続けて実行するか。 */
  autoReviewAnalysis: boolean
}

export const DEPTH_CONFIG: Record<ResearchDepth, DepthConfig> = {
  QUICK: {
    label: '簡易',
    description: '最小限のデータで素早く傾向を掴む(約1分)。AI競合分析は省略します。',
    perSourceLimit: 8,
    aiProductCap: 10,
    runCompetitorAnalysis: false,
    autoReviewAnalysis: false,
  },
  STANDARD: {
    label: '標準',
    description: '価格・市場規模に加え、AIによる競合分析まで行う標準的な調査。',
    perSourceLimit: 20,
    aiProductCap: 20,
    runCompetitorAnalysis: true,
    autoReviewAnalysis: false,
  },
  DEEP: {
    label: '詳細',
    description: 'より多くの商品を分析し、完了後にレビュー解析まで自動で実行します(時間がかかります)。',
    perSourceLimit: 35,
    aiProductCap: 30,
    runCompetitorAnalysis: true,
    autoReviewAnalysis: true,
  },
}

export const DEPTH_ORDER: ResearchDepth[] = ['QUICK', 'STANDARD', 'DEEP']

/**
 * 簡易モード用: AI(competitor-analysis)を呼ばずに実売データだけから
 * 最低限のUSP・価格帯を機械的に組み立てる。ネットワーク帯域のみで完結するため高速。
 */
export function heuristicCompetitorAnalysis(
  products: MarketProduct[],
  targetPrice: number | null,
): CompetitorAnalysisOutput {
  const prices = products.map((product) => product.price).filter((price): price is number => typeof price === 'number')
  const sorted = [...prices].sort((a, b) => a - b)
  const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] ?? null : null
  const low = median ? median * 0.85 : null
  const high = median ? median * 1.15 : null

  const priceTier = (price: number | null): 'LOW' | 'MID' | 'HIGH' => {
    if (price === null || low === null || high === null) return 'MID'
    if (price < low) return 'LOW'
    if (price > high) return 'HIGH'
    return 'MID'
  }

  return {
    competitors: products.map((product) => ({
      externalId: product.externalId,
      brand: product.brand ?? null,
      usp: product.reviewCount && product.reviewCount > 500 ? 'レビュー数が多く実績で選ばれている' : '価格・入手性で選ばれている',
      strengths: [product.rating && product.rating >= 4.3 ? '評価が高い' : '価格が手頃'].filter(Boolean),
      weaknesses: [],
      priceTier: priceTier(product.price ?? null),
    })),
    landscape: '【簡易分析】AIによる詳細比較は行っていません。実売データの価格分布のみを機械的に集計しています。',
    whiteSpaces: [],
    benchmarkPrice: targetPrice ?? median ?? null,
  }
}
