import type { Provider, ProviderOutcome } from '../types'

export type VideoAspect = '9:16' | '16:9' | '1:1'

export type VideoGenerateRequest = {
  prompt: string
  durationSec: number
  aspectRatio: VideoAspect
  resolution?: string
  /** 商品画像。base64。多くのProviderが image-to-video を受け付ける。 */
  images?: { base64: string; mimeType: string }[]
  webhookUrl?: string
  /** シーン単位再生成のための識別子(要件67)。 */
  sceneRef?: string
}

export type VideoJobState = {
  providerJobId: string
  status: 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress?: number
  /** 完成した動画。Providerが直接URLを返す場合と、バイト列を返す場合がある。 */
  videoUrl?: string
  asset?: { base64: string; mimeType: string }
  thumbnail?: { base64: string; mimeType: string }
  error?: string
}

export interface VideoProvider extends Provider {
  readonly synthetic: boolean
  generate(request: VideoGenerateRequest): Promise<ProviderOutcome<VideoJobState>>
  getJob(providerJobId: string): Promise<ProviderOutcome<VideoJobState>>
  cancel(providerJobId: string): Promise<ProviderOutcome<VideoJobState>>
  download(providerJobId: string): Promise<ProviderOutcome<{ base64: string; mimeType: string }>>
}
