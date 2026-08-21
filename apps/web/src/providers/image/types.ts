import type { Provider, ProviderOutcome } from '../types'

export type ImageAngleId =
  | 'FRONT'
  | 'FRONT_RIGHT'
  | 'RIGHT'
  | 'BACK_RIGHT'
  | 'BACK'
  | 'BACK_LEFT'
  | 'LEFT'
  | 'FRONT_LEFT'

export const IMAGE_ANGLES: ImageAngleId[] = [
  'FRONT',
  'FRONT_RIGHT',
  'RIGHT',
  'BACK_RIGHT',
  'BACK',
  'BACK_LEFT',
  'LEFT',
  'FRONT_LEFT',
]

export const ANGLE_LABEL: Record<ImageAngleId, string> = {
  FRONT: '正面',
  FRONT_RIGHT: '右斜め前',
  RIGHT: '右側面',
  BACK_RIGHT: '右斜め後ろ',
  BACK: '背面',
  BACK_LEFT: '左斜め後ろ',
  LEFT: '左側面',
  FRONT_LEFT: '左斜め前',
}

export const ANGLE_DEGREES: Record<ImageAngleId, number> = {
  FRONT: 0,
  FRONT_RIGHT: 45,
  RIGHT: 90,
  BACK_RIGHT: 135,
  BACK: 180,
  BACK_LEFT: 225,
  LEFT: 270,
  FRONT_LEFT: 315,
}

/** 生成された画像そのもの。保存先は StorageProvider が決めるため URL は持たない。 */
export type GeneratedImage = {
  base64: string
  mimeType: string
  prompt: string
  seed?: string
  width?: number
  height?: number
  angle?: ImageAngleId
  variant?: string
}

export type ImageGenerateRequest = {
  prompt: string
  count?: number
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16'
  /** 参照画像(アンカー画像など)。base64。 */
  referenceImages?: { base64: string; mimeType: string }[]
  seed?: string
  variantLabels?: string[]
  model?: string
}

export type ImageEditRequest = {
  base: { base64: string; mimeType: string }
  instruction: string
  seed?: string
  model?: string
}

export type MultiAngleRequest = {
  anchor: { base64: string; mimeType: string }
  productDescription: string
  angles?: ImageAngleId[]
  seed?: string
  model?: string
}

export interface ImageProvider extends Provider {
  readonly synthetic: boolean
  generate(request: ImageGenerateRequest): Promise<ProviderOutcome<GeneratedImage[]>>
  edit(request: ImageEditRequest): Promise<ProviderOutcome<GeneratedImage>>
  variation(request: ImageGenerateRequest): Promise<ProviderOutcome<GeneratedImage[]>>
  multiAngle(request: MultiAngleRequest): Promise<ProviderOutcome<GeneratedImage[]>>
}
