import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const oemDocumentSchema = z.object({
  title: z.string(),
  productOverview: z.string(),
  targetCostNote: z.string(),
  moq: z.number().int().nullable(),
  sections: z
    .array(z.object({ heading: z.string(), items: z.array(z.object({ label: z.string(), value: z.string() })) }))
    .min(4),
  improvementPoints: z.array(z.string()).default([]),
  questionsForSupplier: z.array(z.string()).default([]),
  desiredLeadTime: z.string().nullable(),
})

export type OEMDocumentOutput = z.infer<typeof oemDocumentSchema>

export type OEMDocumentInput = {
  context: ProjectContextSnapshot
  kind: 'SPECIFICATION' | 'REVISION_REQUEST'
}

/** STEP 8 / 次回ロット: 製造会社へ提出できる仕様書を生成する(要件44, 45, 75)。 */
export const oemDocumentTask: AITask<OEMDocumentInput, OEMDocumentOutput> = {
  id: 'oem-document',
  system: `${BASE_SYSTEM}

OEM工場へそのまま提出できる仕様書を作成してください。

ルール:
- 受け取った工場が追加質問なしで見積を出せる粒度にする。
- 数値は必ず単位つき。公差が必要な項目には公差を書く(例: ±0.5mm)。
- 「商品概要」「寸法・重量」「材質・仕上げ」「機能・構造」「品質基準」「梱包・パッケージ」を必ず含める。
- REVISION_REQUEST の場合は、変更前後を対比した「変更点」セクションを先頭に置く。
- questionsForSupplier には、こちらから工場へ確認すべき事項を5件程度。`,
  schema: oemDocumentSchema,
  buildUser: (input) =>
    `${formatProjectContext(input.context)}\n\n文書種別: ${
      input.kind === 'SPECIFICATION' ? '新規OEM仕様書' : '次回ロット修正依頼書'
    }\n\n仕様書を作成してください。`,
  mock: (input) => {
    const spec = input.context.specification
    const name = input.context.product?.name ?? '新商品'
    return {
      title: input.kind === 'SPECIFICATION' ? `${name} OEM仕様書 v1` : `${name} 次回ロット修正依頼書`,
      productOverview: `【サンプル】${name}。家庭用の小型製品で、分解洗浄と省スペース収納を主要要件とする。`,
      targetCostNote: `目標製造原価: ${
        input.context.cost?.maxManufacturingCost.toLocaleString('ja-JP') ?? '未設定'
      }円以下(FOB、税抜)。この範囲を超える場合は代替素材の提案を希望。`,
      moq: 500,
      sections: [
        {
          heading: '寸法・重量',
          items: [
            { label: '外形寸法', value: spec?.size ?? 'W180 × D120 × H240 mm(公差 ±1.0mm)' },
            { label: '収納時寸法', value: 'W180 × D120 × H150 mm' },
            { label: '製品重量', value: spec?.weight ?? '約1.2 kg(±5%)' },
          ],
        },
        {
          heading: '材質・仕上げ',
          items: [
            { label: '本体', value: spec?.material ?? 'ABS樹脂(難燃グレード)' },
            { label: '表面仕上げ', value: 'マット処理、光沢度 10±3 GU' },
            { label: 'カラー', value: spec?.color ?? 'オフホワイト / チャコールグレー' },
          ],
        },
        {
          heading: '機能・構造',
          items: (spec?.features ?? ['分解洗浄可能な2ピース構造', '運転音50dB以下']).map((feature, index) => ({
            label: `機能${index + 1}`,
            value: feature,
          })),
        },
        {
          heading: '品質基準',
          items: [
            { label: '落下試験', value: '1.0m × 6面、外観破損・機能異常なし' },
            { label: '外観検査', value: 'AQL 2.5(Major)/ 4.0(Minor)' },
            { label: '法規', value: '日本 電気用品安全法(PSE)適合、菱形PSE表示' },
          ],
        },
        {
          heading: '梱包・パッケージ',
          items: [
            { label: '個装', value: spec?.packaging ?? '化粧箱(段ボールE段、フルカラー印刷)' },
            { label: '緩衝材', value: 'パルプモールド(四隅角当て)' },
            { label: '外装', value: '1カートンあたり10個、カートン重量15kg以下' },
          ],
        },
      ],
      improvementPoints: [
        '内部パーツを工具なしで着脱できること(市場レビューの最多不満への対応)',
        '運転音を50dB以下に抑えること',
      ],
      questionsForSupplier: [
        '提示仕様でのFOB単価とMOQをご教示ください',
        'サンプル製作費と所要日数をご教示ください',
        '金型費が発生する場合、その金額と償却条件をご教示ください',
        'PSE取得のご経験と、対応可否をご教示ください',
        '初回ロットの納期(発注後の日数)をご教示ください',
      ],
      desiredLeadTime: '初回サンプル 3週間以内 / 量産 発注後60日以内',
    }
  },
}
