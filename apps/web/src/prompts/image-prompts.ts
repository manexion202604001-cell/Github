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

/**
 * 3つのコンセプト方向(要件15)。
 * 色違いにならないよう、方向ごとにシルエット・構造・素材・仕上げを明示的に振り分ける。
 * AIブリーフが使えない場合のフォールバックとしても、この定義だけで3案が明確に別物になる。
 */
export const CONCEPT_DIRECTIONS: ConceptDirection[] = [
  {
    variant: 'A',
    label: 'ミニマル・プレミアム',
    description:
      'Silhouette: a single clean monolithic volume with tight, precise radii and one uninterrupted body surface. Structure: minimal parting lines, a flush integrated closure that reads as part of the body. Material: soft-touch matte finish with one thin brushed-metal accent line. Lighting: broad soft key, restrained contrast. Overall impression: quiet, precise, expensive.',
  },
  {
    variant: 'B',
    label: 'フューチャー・イノベーティブ',
    description:
      'Silhouette: a precise faceted or gently tapered body — clearly not a plain cylinder — with a cap that shares the same footprint and seats squarely and flush on the body. Structure: a crisp horizontal or subtly angled parting line where cap and body meet perfectly, no floating or misaligned parts, no exposed mechanism. Material: semi-gloss technical polymer or glass with sharp, cleanly machined edges and a slim metal collar. Lighting: directional rim light that catches each facet. Overall impression: engineered, forward-looking, immaculately assembled.',
  },
  {
    variant: 'C',
    label: 'ライフスタイル・マーケット',
    description:
      'Silhouette: a soft organic form that fits in the palm — wide, rounded, low-slung proportions rather than tall and slim. Structure: generous curvature, a friendly oversized cap or a squat jar-like body. Material: warm matte texture with a tactile grip detail. Lighting: warm natural window-like light. Overall impression: approachable, easy to pick up on a shelf.',
  },
]

/** 各案が互いに別物であることを強制する共通指示。 */
const DISTINCTNESS_RULE =
  'This is one of three competing design concepts for the same product. It MUST differ from the others in overall silhouette, proportion, closure/cap type and material impression — a different colour of the same shape is unacceptable. Follow the design direction faithfully while staying unmistakably recognisable as a product of its stated category — a shopper must identify what it is at a glance. The result must still look like a real mass-producible product photographed for a flagship brand page.'

const BASE_RULES = [
  'a real studio photograph of a physical product — captured with a camera, NOT a 3D render, NOT CGI, NOT an illustration',
  'shot on a full-frame camera with an 85mm lens at f/8, tack-sharp focus across the whole product, natural optical depth',
  'large softbox key light from the upper left with a soft gradient falloff, gentle fill from the right, one soft contact shadow grounding the product',
  'physically accurate materials: true-to-life reflections, fine micro-texture, crisp edge highlights, subtle real-world surface imperfections',
  'seamless studio backdrop in clean white to very light neutral grey (#FFFFFF to #F2F2F2), softly lit, no colour cast, no props unless specified',
  'the product must be fully in frame, centred, upright, with generous negative space and no cropping',
  'no text, no logo, no watermark, no brand name anywhere in the image',
  'no human hands or faces unless explicitly requested',
  'high dynamic range, neutral professional colour grading, magazine-quality commercial retouching',
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

${DISTINCTNESS_RULE}

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

${DISTINCTNESS_RULE}

${BASE_RULES}`
}


/**
 * 用途別画像(要件19)の専用プロンプト。
 * コンセプト用と違い「新しいデザインを作らない」ことが最重要:
 * アンカー画像の商品をそのまま、撮り方だけ変える。
 */
export function buildPresetPrompt(productDescription: string, preset: ImageKindPreset, hasAnchor: boolean): string {
  const identity = hasAnchor
    ? 'The attached reference image shows the exact product to photograph. Reproduce THIS product with complete fidelity — identical shape, proportions, colours, materials, cap, seams and details. Do NOT redesign, restyle or substitute the product in any way; only the setting, composition, camera and lighting change for this shot type.'
    : `Product to photograph: ${productDescription}. Keep the product design consistent and plausible as a real mass-produced item.`
  const person = preset.withPerson
    ? 'Include one photorealistic human model as described. The model must look natural and belong to the scene; hands interacting with the product must be anatomically correct.'
    : 'No people in the frame.'

  return `${identity}

Shot type (${preset.label}): ${preset.prompt}

${person}

Photography quality: a real photograph captured with a camera — not a 3D render, not an illustration. Full-frame camera, tack-sharp focus on the product, physically accurate materials and reflections, high dynamic range, professional colour grading. No text, no logo, no watermark anywhere in the image.`
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
  /** 使用シーン等、人物モデルを含めて生成する種類か。 */
  withPerson?: boolean
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
    description: 'モデルが実際に使っている様子',
    prompt:
      'A Japanese adult model (matching the product\'s target customer) naturally using the product in a bright, tidy Japanese apartment — candid lifestyle photography, natural window light, relaxed authentic expression, the product clearly visible and in focus as the hero of the shot.',
    aspectRatio: '4:3',
    withPerson: true,
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
    prompt:
      'Vertical composition for social media: a Japanese model casually holding or using the product, warm approachable atmosphere, the product in sharp focus in the upper two-thirds, negative space at the bottom for text overlay.',
    aspectRatio: '9:16',
    withPerson: true,
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
