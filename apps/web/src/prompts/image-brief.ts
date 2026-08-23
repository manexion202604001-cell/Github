import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { BASE_SYSTEM } from './context'

/**
 * 画像生成用ブリーフ(要件14拡張)。
 * ユーザーのラフな入力(単語・断片・短文)をAIが補完・整理し、
 * 方向性の異なるコンセプト3案の設計図に変換する。
 */

export const imageBriefFieldsSchema = z.object({
  productType: z.string(),
  targetUser: z.string(),
  problemToSolve: z.string(),
  usageScene: z.string(),
  keyFeatures: z.array(z.string()).max(6),
  aestheticDirection: z.string(),
  materialSuggestion: z.string(),
  colorPalette: z.string(),
  premiumLevel: z.string(),
  feasibilityNotes: z.string(),
})

export const conceptPlanSchema = z.object({
  variant: z.enum(['A', 'B', 'C']),
  directionKey: z.enum(['MINIMAL_PREMIUM', 'FUTURE_INNOVATIVE', 'LIFESTYLE_MARKETABLE']),
  conceptName: z.string(),
  summary: z.string(),
  /** 画像モデルへ渡す視覚方針。英語で具体的に(シルエット・構造・素材・光)。 */
  visualDirection: z.string(),
})

export const imageBriefSchema = z.object({
  brief: imageBriefFieldsSchema,
  concepts: z.array(conceptPlanSchema).length(3),
})

export type ImageBriefOutput = z.infer<typeof imageBriefSchema>
export type ConceptPlan = z.infer<typeof conceptPlanSchema>

export type ImageBriefInput = {
  rawIdea: string
  aids: {
    category?: string
    target?: string
    priceRange?: string
    color?: string
    taste?: string
    brand?: string
    notes?: string
  }
  product: { name: string; category: string | null; description: string | null }
}

export const imageBriefTask: AITask<ImageBriefInput, ImageBriefOutput> = {
  id: 'image-brief',
  system: `${BASE_SYSTEM}

あなたの仕事は、ユーザーのラフな商品イメージ入力(単語だけ・断片だけでも可)を補完・整理し、商品画像生成のための構造化ブリーフと、方向性の異なるコンセプト3案の設計図を作ることです。

ルール:
- 不足情報はユーザーに聞き返さず、商品として合理的な内容で補完する。
- brief の各項目は日本語で簡潔に書く。keyFeatures は視覚的に表現できる特徴を優先する。
- concepts は必ず3案。方向性は次の割り当てに従う:
  A = MINIMAL_PREMIUM(ミニマル・プレミアム: 端正で高級感のある佇まい)
  B = FUTURE_INNOVATIVE(フューチャー・イノベーティブ: 未来的・革新的な構造や造形)
  C = LIFESTYLE_MARKETABLE(ライフスタイル・マーケット: 生活に馴染み売り場で選ばれやすい)
- 3案は色違いにしない。シルエット・構造・素材感・印象が明確に異なること。
- いずれの案も実際に量産できそうなデザインにする(コンセプトアート禁止、商品写真レベル)。
- conceptName は10文字前後の日本語。summary は1〜2文の日本語。
- visualDirection は画像生成モデルに渡すため英語で書く。シルエット・構造・素材・仕上げ・光の扱いを具体的に。色は主役にしない。
- ブランド名が与えられた場合も visualDirection にロゴや文字を入れる指示は書かない。`,
  schema: imageBriefSchema,
  maxTokens: 6144,
  buildUser: (input) => {
    const aids = Object.entries(input.aids)
      .filter(([, value]) => typeof value === 'string' && value.trim() !== '')
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n')
    return `## ユーザーのラフ入力
${input.rawIdea}

## 補助情報(任意入力)
${aids || '(なし)'}

## プロジェクトの商品情報(参考)
${JSON.stringify(input.product, null, 2)}

## 出力
{
  "brief": { "productType": "...", "targetUser": "...", "problemToSolve": "...", "usageScene": "...", "keyFeatures": ["..."], "aestheticDirection": "...", "materialSuggestion": "...", "colorPalette": "...", "premiumLevel": "...", "feasibilityNotes": "..." },
  "concepts": [
    { "variant": "A", "directionKey": "MINIMAL_PREMIUM", "conceptName": "...", "summary": "...", "visualDirection": "english visual direction" },
    { "variant": "B", "directionKey": "FUTURE_INNOVATIVE", ... },
    { "variant": "C", "directionKey": "LIFESTYLE_MARKETABLE", ... }
  ]
}`
  },
  mock: (input) => ({
    brief: {
      productType: input.aids.category || input.product.category || '生活雑貨',
      targetUser: input.aids.target || '20〜40代の都市部生活者',
      problemToSolve: '既存品はデザインが没個性で、持ち歩き・ギフトに選びにくい',
      usageScene: '通勤・旅行・自宅でのリラックスタイム',
      keyFeatures: ['ワンハンドで扱える形状', '手入れしやすい構造', '省スペース収納'],
      aestheticDirection: input.aids.taste || 'クリーンで現代的、余白のあるデザイン',
      materialSuggestion: 'マット塗装の樹脂+金属アクセント',
      colorPalette: input.aids.color || 'オフホワイト / チャコール',
      premiumLevel: input.aids.priceRange || 'ミドル〜ややプレミアム',
      feasibilityNotes: '【サンプル】射出成形+アルマイト加工で量産可能な範囲に収めた想定です。',
    },
    concepts: [
      {
        variant: 'A',
        directionKey: 'MINIMAL_PREMIUM',
        conceptName: '静謐ミニマル',
        summary: '装飾を削ぎ落とし、面の美しさと質感で高級感を出す案。',
        visualDirection:
          'Clean monolithic silhouette with tight radii, matte soft-touch finish, single subtle metal accent line, studio softbox lighting.',
      },
      {
        variant: 'B',
        directionKey: 'FUTURE_INNOVATIVE',
        conceptName: '近未来シェル',
        summary: '分割シェル構造と斜めのパーティングで未来感を出す案。',
        visualDirection:
          'Faceted two-part shell structure with a diagonal parting line, semi-gloss technical polymer, precise seams, cool rim lighting.',
      },
      {
        variant: 'C',
        directionKey: 'LIFESTYLE_MARKETABLE',
        conceptName: '日常フィット',
        summary: '丸みと軽さで生活に馴染み、棚で手に取りやすい案。',
        visualDirection:
          'Friendly rounded silhouette, lightweight look with soft matte texture and fabric-like grip detail, warm neutral studio light.',
      },
    ],
  }),
}
