import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const productSpecificationSchema = z.object({
  size: z.string(),
  weight: z.string(),
  material: z.string(),
  color: z.string(),
  features: z.array(z.string()).min(1),
  structure: z.string(),
  power: z.string().nullable(),
  accessories: z.array(z.string()).default([]),
  packaging: z.string(),
  cautions: z.array(z.string()).default([]),
  qualityStandards: z.array(z.string()).default([]),
  rationale: z.string(),
})

export type ProductSpecificationOutput = z.infer<typeof productSpecificationSchema>

/** STEP 7: 市場分析・レビュー・利益計算から商品仕様を確定する(要件42, 43)。 */
export const productSpecificationTask: AITask<{ context: ProjectContextSnapshot }, ProductSpecificationOutput> = {
  id: 'product-specification',
  system: `${BASE_SYSTEM}

製造に渡せる粒度の商品仕様を作成してください。

ルール:
- 寸法・重量は必ず単位つきの具体値(例: W180 × D120 × H240 mm / 約1.2kg)。
- 曖昧な表現(「適度な」「十分な」)を使わない。
- qualityStandards には検査項目と合格基準を書く(例: 落下試験 1.0m×6面 外観破損なし)。
- cautions には日本の法令上必要な表示・注意事項を含める。
- rationale では、なぜこの仕様にしたかを市場データ・レビュー不満と紐づけて説明する。`,
  schema: productSpecificationSchema,
  buildUser: (input) =>
    `${formatProjectContext(input.context)}\n\n上記を踏まえ、量産に渡せる商品仕様を作成してください。原価目標がある場合はそれを満たす仕様にしてください。`,
  mock: (input) => ({
    size: 'W180 × D120 × H240 mm(収納時 W180 × D120 × H150 mm)',
    weight: '約1.2 kg',
    material: '本体: ABS樹脂(難燃グレード) / 内部タンク: PP / パッキン: シリコーン',
    color: 'オフホワイト / チャコールグレー の2色',
    features: [
      '分解洗浄可能な2ピース構造',
      '運転音 50dB 以下',
      '自動停止機能(空焚き防止)',
      '折りたたみ収納',
    ],
    structure: '本体・タンク・カバーの3パーツ構成。タンクとカバーは工具なしで着脱可能。',
    power: 'AC100V 50/60Hz、消費電力 400W、ケーブル長 1.5m',
    accessories: ['取扱説明書(日本語)', '保証書', '専用ブラシ'],
    packaging: '化粧箱(段ボールE段、フルカラー印刷)+ 緩衝材(パルプモールド)。外装に収納時サイズを明記。',
    cautions: [
      '電気用品安全法(PSE)の対象。菱形PSEマークおよび届出事業者名の表示が必要',
      'water tank に水以外を入れない旨を本体および説明書に表示',
      '幼児の手の届く場所で使用しない旨を表示',
    ],
    qualityStandards: [
      '落下試験: 1.0m × 6面 — 外観破損・機能異常なし',
      '連続運転試験: 8時間 × 3回 — 温度上昇 40K 以下',
      '着脱耐久試験: タンク着脱 3,000回 — 保持力低下 20%以内',
      '外観検査: AQL 2.5(Major)/ 4.0(Minor)',
    ],
    rationale: `【サンプル】レビュー不満の最多である「掃除しづらい」(36%)に対して分解洗浄構造を必須とし、「大きい」(18%)に対して収納時高さを150mmに抑えました。原価目標${
      input.context.cost?.maxManufacturingCost.toLocaleString('ja-JP') ?? '未設定'
    }円に収めるため、素材はABSを基本とし、金属パーツは着脱部のみに限定しています。`,
  }),
}
