import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

const TARGETS = [
  'PRICE',
  'IMAGE',
  'LP',
  'VIDEO',
  'SEO',
  'ADVERTISING',
  'SPECIFICATION',
  'PACKAGING',
  'SIZE',
  'NEXT_LOT',
] as const

export const productImprovementSchema = z.object({
  improvements: z
    .array(
      z.object({
        target: z.enum(TARGETS),
        title: z.string(),
        currentState: z.string().nullable(),
        proposal: z.string(),
        reason: z.string(),
        expectedEffect: z.string(),
        priority: z.number().int().min(1).max(5),
        evidence: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  nextLotSummary: z.string().nullable(),
  relatedProductIdeas: z
    .array(z.object({ type: z.string(), name: z.string(), reason: z.string() }))
    .default([]),
})

export type ProductImprovementOutput = z.infer<typeof productImprovementSchema>

export type ProductImprovementInput = {
  context: ProjectContextSnapshot
  /** 'DESIGN' = 開発前の仕様改善 / 'POST_SALE' = 販売後の改善 */
  phase: 'DESIGN' | 'POST_SALE'
}

/**
 * STEP 5 / STEP 13: 競合データ・レビュー・販売実績から改善案を出す(要件35, 36, 72〜76)。
 */
export const productImprovementTask: AITask<ProductImprovementInput, ProductImprovementOutput> = {
  id: 'product-improvement',
  system: `${BASE_SYSTEM}

商品の改善提案を作成してください。

ルール:
- 各提案は「現状 → 提案 → 理由 → 予想効果」が揃っていること。
- reason には必ずデータ上の根拠(レビュー不満の割合、競合の価格、ACOSなど)を数値で引用する。
- priority は 1(最優先)〜5。
- POST_SALE フェーズでは nextLotSummary に次回ロットでの変更点をまとめる。
- relatedProductIdeas には 関連商品 / セット商品 / 消耗品 / 上位モデル / 廉価モデル のいずれかの type を付ける。`,
  schema: productImprovementSchema,
  maxTokens: 8192,
  buildUser: (input) =>
    `${formatProjectContext(input.context)}\n\nフェーズ: ${
      input.phase === 'DESIGN' ? '開発前(仕様改善)' : '販売後(実績に基づく改善)'
    }\n\n改善提案を作成してください。`,
  mock: (input) => ({
    improvements: [
      {
        target: 'SPECIFICATION' as const,
        title: '容量を5L → 3.5Lへ変更',
        currentState: '容量5L',
        proposal: '容量を3.5Lに縮小し、設置面積を約25%削減する',
        reason: '競合レビューで「大きすぎる」という不満が18%を占め、購入時の最大の障壁になっているため。',
        expectedEffect: '設置性を理由とした離脱を減らし、CVR +0.5pt 程度の改善を見込む',
        priority: 1,
        evidence: ['レビュー不満クラスタ「大きい」18%'],
      },
      {
        target: 'SPECIFICATION' as const,
        title: '分解洗浄できる構造へ変更',
        currentState: '一体型で内部を洗えない',
        proposal: '本体を2ピース構造にし、内部パーツを取り外して丸洗い可能にする',
        reason: '最多の不満クラスタ「掃除しづらい」が36%。競合上位でも解決できていない。',
        expectedEffect: '星1〜2レビューの主要因を除去し、平均評価 +0.3 を狙う',
        priority: 1,
        evidence: ['レビュー不満クラスタ「掃除しづらい」36%'],
      },
      {
        target: 'IMAGE' as const,
        title: 'サブ画像に収納サイズ比較を追加',
        currentState: '商品単体カットのみ',
        proposal: '一般的な収納棚・A4サイズとの比較画像をサブ画像2枚目に配置する',
        reason: 'サイズ不安が返品理由の上位にあるため、購入前に解消する。',
        expectedEffect: '返品率の低減',
        priority: 2,
        evidence: ['返品理由「サイズが想定と違った」'],
      },
    ],
    nextLotSummary:
      input.phase === 'POST_SALE'
        ? '【サンプル】次回ロットでは容量3.5L化・分解洗浄構造・静音50dB以下の3点を反映する。'
        : null,
    relatedProductIdeas: [
      { type: '消耗品', name: '交換用フィルター(2個入り)', reason: 'リピート購入による LTV 向上' },
      { type: '上位モデル', name: '大容量モデル(5L)', reason: 'ファミリー層向けの受け皿として併売する' },
    ],
  }),
}
