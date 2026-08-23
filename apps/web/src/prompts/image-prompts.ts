import type { ContextProduct } from '@/types/context'
import type { ConceptPlan, ImageBriefOutput } from './image-brief'

/**
 * 画像生成用プロンプトの組み立て(要件14〜20)。
 * Component からは呼ばず、必ず service / job 経由で使う。
 */

export type ConceptDirection = {
  variant: 'A' | 'B' | 'C'
  label: string
  description: string
}

/** 3つのコンセプト方向(要件15)。 */
export const CONCEPT_DIRECTIONS: ConceptDirection[] = [
  {
    variant: 'A',
    label: '売れ筋重視',
    description:
      '市場のボリュームゾーンに寄せた、万人受けするデザイン。奇をてらわず、清潔感と分かりやすさを優先する。白やライトグレーを基調に、機能が一目で伝わる形状。',
  },
  {
    variant: 'B',
    label: '高級感重視',
    description:
      'マットな質感、抑えた彩度、細いパーティングライン。金属調のアクセントを最小限に配置し、質量感のあるプロポーションにする。ギフト需要に耐えるデザイン。',
  },
  {
    variant: 'C',
    label: '差別化重視',
    description:
      '競合が採用していない構造やシルエットで、棚に並んだときに一目で違いが分かるデザイン。色または形状のどちらかで明確なアイデンティティを作る。',
  },
]

const BASE_RULES = [
  'photorealistic product photography, studio lighting, soft shadow directly under the product',
  'pure white background (#FFFFFF), no props unless specified',
  'the product must be fully in frame, centered, no cropping',
  'no text, no logo, no watermark, no brand name anywhere in the image',
  'no human hands or faces unless explicitly requested',
].join('. ')

function describeProduct(product: Pick<ContextProduct, 'name' | 'category' | 'description' | 'material' | 'color' | 'size' | 'features'>): string {
  const parts = [
    `Product: ${product.name}`,
    product.category ? `Category: ${product.category}` : null,
    product.description ? `Description: ${product.description}` : null,
    product.material ? `Material: ${product.material}` : null,
    product.color ? `Color: ${product.color}` : null,
    product.size ? `Approximate size: ${product.size}` : null,
    product.features.length > 0 ? `Key features to express visually: ${product.features.slice(0, 5).join(', ')}` : null,
  ]
  return parts.filter((part): part is string => part !== null).join('\n')
}

export function buildConceptPrompt(
  product: Parameters<typeof describeProduct>[0],
  direction: ConceptDirection,
): string {
  return `${describeProduct(product)}

Design direction (${direction.label}): ${direction.description}

${BASE_RULES}`
}

/**
 * AIブリーフに基づくコンセプト案プロンプト。
 * 3案が色違いにならないよう、シルエット・構造・素材の差別化を明示する。
 */
export function buildPlannedConceptPrompt(brief: ImageBriefOutput['brief'], plan: ConceptPlan): string {
  return `Product type: ${brief.productType}
Target user: ${brief.targetUser}
Usage scene: ${brief.usageScene}
Key features to express visually: ${brief.keyFeatures.slice(0, 5).join(', ')}
Suggested material: ${brief.materialSuggestion}
Color palette: ${brief.colorPalette}
Premium level: ${brief.premiumLevel}

Design direction (${plan.conceptName}): ${plan.visualDirection}

This is one of three distinct design concepts. It must differ from the other concepts in silhouette, structure and material impression — never a mere color variation. The design must look manufacturable as a real mass-produced product, at product-photography quality (not concept art).

${BASE_RULES}`
}

/** アンカー画像を基準にした角度別プロンプト(要件16, 17)。 */
export function buildAnglePrompt(productDescription: string, angleLabel: string): string {
  return `Render the exact same product as in the reference image, viewed from a different angle.

Viewpoint: ${angleLabel}
Critical: shape, proportions, color, material, surface finish, part layout and every detail must be identical to the reference image. Only the camera angle changes.

${BASE_RULES}

Product context: ${productDescription}`
}

export type ImageKindPreset = {
  id: string
  label: string
  description: string
  prompt: string
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16'
}

/** 商品画像の種類(要件19)。 */
export const IMAGE_PRESETS: ImageKindPreset[] = [
  {
    id: 'PRODUCT_ONLY',
    label: '商品単体',
    description: '商品だけを写した基本カット',
    prompt: 'Product alone, straight-on view, neutral studio lighting.',
    aspectRatio: '1:1',
  },
  {
    id: 'WHITE_BG',
    label: '白背景',
    description: 'Amazon規格に沿った純白背景',
    prompt: 'Pure white background (#FFFFFF), the product fills about 85% of the frame, no shadow bleeding to frame edges.',
    aspectRatio: '1:1',
  },
  {
    id: 'TRANSPARENT',
    label: '背景透過',
    description: '合成用の背景なしカット',
    prompt: 'Isolated product cut-out on a plain flat background with clean edges suitable for masking.',
    aspectRatio: '1:1',
  },
  {
    id: 'LIFESTYLE',
    label: '使用シーン',
    description: '生活の中で使われている様子',
    prompt: 'The product in a bright, tidy Japanese apartment, natural window light, lived-in but uncluttered scene.',
    aspectRatio: '4:3',
  },
  {
    id: 'LUXURY',
    label: '高級ブランド風',
    description: '質感を強調したブランドカット',
    prompt: 'Dark, moody studio setup, single soft key light grazing the surface, deep shadows, premium editorial mood.',
    aspectRatio: '4:3',
  },
  {
    id: 'AMAZON_MAIN',
    label: 'Amazonメイン画像',
    description: '検索結果で目を引く主画像',
    prompt: 'Pure white background, product occupies 85% of the frame, sharp focus across the whole product, no accessories.',
    aspectRatio: '1:1',
  },
  {
    id: 'AMAZON_SUB',
    label: 'Amazonサブ画像',
    description: '特徴を説明する補足画像',
    prompt: 'Close-up detail shot highlighting one specific feature, clean light background, plenty of negative space for later caption overlay.',
    aspectRatio: '1:1',
  },
  {
    id: 'SNS',
    label: 'SNS画像',
    description: 'SNS投稿・広告向け',
    prompt: 'Vertical composition, the product placed in the upper third, warm and casual atmosphere, negative space at the bottom for text.',
    aspectRatio: '9:16',
  },
  {
    id: 'LP',
    label: 'LP画像',
    description: 'LPのセクション用ワイドカット',
    prompt: 'Wide horizontal composition with generous negative space on one side for headline text, calm neutral setting.',
    aspectRatio: '16:9',
  },
]

/** 画像編集の指示テンプレート(要件20)。 */
export const EDIT_PRESETS: { id: string; label: string; template: string }[] = [
  { id: 'color', label: '色変更', template: 'Change the product body color to {value}. Keep everything else identical.' },
  { id: 'material', label: '素材変更', template: 'Change the surface material to {value}. Keep the shape and proportions identical.' },
  { id: 'shape', label: '形変更', template: 'Adjust the product silhouette: {value}. Keep the color and material identical.' },
  { id: 'scale', label: 'サイズ感変更', template: 'Show the product at a different perceived scale: {value}.' },
  { id: 'add-part', label: 'パーツ追加', template: 'Add the following part to the product: {value}. Integrate it naturally into the existing design.' },
  { id: 'remove-part', label: 'パーツ削除', template: 'Remove the following part from the product: {value}. Close the resulting gap naturally.' },
  { id: 'logo', label: 'ロゴ追加', template: 'Place a small abstract, non-existent brand mark on the product: {value}. Do not use any real brand logo.' },
  { id: 'background', label: '背景変更', template: 'Replace the background with: {value}. Keep the product itself completely unchanged.' },
]

export function buildEditPrompt(presetId: string, value: string): string {
  const preset = EDIT_PRESETS.find((item) => item.id === presetId)
  if (!preset) return value
  return preset.template.replace('{value}', value)
}
