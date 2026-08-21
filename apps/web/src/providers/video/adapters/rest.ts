import { emptyUsage, providerError, type ProviderOutcome } from '../../types'
import { estimateVideoCostMicro } from '../../ai/pricing'
import { getJson, postJson } from '../../ai/adapters/http'
import type { VideoGenerateRequest, VideoJobState, VideoProvider } from '../types'

type RestJobResponse = {
  id?: string
  job_id?: string
  status?: string
  progress?: number
  video_url?: string
  videoUrl?: string
  thumbnail_url?: string
  error?: string
}

const STATUS_MAP: Record<string, VideoJobState['status']> = {
  queued: 'QUEUED',
  pending: 'QUEUED',
  processing: 'GENERATING',
  generating: 'GENERATING',
  running: 'GENERATING',
  succeeded: 'COMPLETED',
  completed: 'COMPLETED',
  failed: 'FAILED',
  error: 'FAILED',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
}

/**
 * 汎用のREST型 Video Provider。
 * 契約する動画生成サービスが決まり次第、baseUrl とレスポンスマッピングのみで対応する。
 * サービス固有のロジックがBusiness Logicへ漏れないよう、変換はすべてここで閉じる(要件64)。
 */
export class RestVideoProvider implements VideoProvider {
  readonly id = 'rest'
  readonly synthetic = false

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  isConfigured(): boolean {
    return this.baseUrl.length > 0 && this.apiKey.length > 0
  }

  private headers(): Record<string, string> {
    return { authorization: `Bearer ${this.apiKey}` }
  }

  async generate(request: VideoGenerateRequest): Promise<ProviderOutcome<VideoJobState>> {
    const result = await postJson(this.id, `${this.baseUrl.replace(/\/$/, '')}/generations`, {
      headers: this.headers(),
      body: {
        prompt: request.prompt,
        duration: request.durationSec,
        aspect_ratio: request.aspectRatio,
        resolution: request.resolution,
        images: request.images?.map((image) => `data:${image.mimeType};base64,${image.base64}`),
        webhook_url: request.webhookUrl,
        metadata: request.sceneRef ? { scene: request.sceneRef } : undefined,
      },
    })

    const usage = { ...emptyUsage(this.id, 'rest-video'), videoSeconds: request.durationSec, estimatedCostMicro: estimateVideoCostMicro(this.id, request.durationSec) }
    if (!result.ok) return { ok: false, error: result.error, usage: emptyUsage(this.id, 'rest-video') }

    const state = this.toState(result.body as RestJobResponse)
    if (!state) {
      return {
        ok: false,
        error: providerError(this.id, 'INVALID_RESPONSE', 'ジョブIDを含まない応答を受け取りました'),
        usage: emptyUsage(this.id, 'rest-video'),
      }
    }
    return { ok: true, data: state, usage }
  }

  async getJob(providerJobId: string): Promise<ProviderOutcome<VideoJobState>> {
    const result = await getJson(
      this.id,
      `${this.baseUrl.replace(/\/$/, '')}/generations/${encodeURIComponent(providerJobId)}`,
      this.headers(),
    )
    const usage = emptyUsage(this.id, 'rest-video')
    if (!result.ok) return { ok: false, error: result.error, usage }

    const state = this.toState(result.body as RestJobResponse, providerJobId)
    if (!state) {
      return { ok: false, error: providerError(this.id, 'INVALID_RESPONSE', '不正なジョブ応答'), usage }
    }
    return { ok: true, data: state, usage }
  }

  async cancel(providerJobId: string): Promise<ProviderOutcome<VideoJobState>> {
    const result = await postJson(
      this.id,
      `${this.baseUrl.replace(/\/$/, '')}/generations/${encodeURIComponent(providerJobId)}/cancel`,
      { headers: this.headers(), body: {} },
    )
    const usage = emptyUsage(this.id, 'rest-video')
    if (!result.ok) return { ok: false, error: result.error, usage }
    return { ok: true, data: { providerJobId, status: 'CANCELLED' }, usage }
  }

  async download(providerJobId: string): Promise<ProviderOutcome<{ base64: string; mimeType: string }>> {
    const usage = emptyUsage(this.id, 'rest-video')
    const job = await this.getJob(providerJobId)
    if (!job.ok) return { ok: false, error: job.error, usage }
    if (!job.data.videoUrl) {
      return { ok: false, error: providerError(this.id, 'UNSUPPORTED', '動画URLがまだ存在しません'), usage }
    }

    try {
      const response = await fetch(job.data.videoUrl)
      if (!response.ok) {
        return { ok: false, error: providerError(this.id, 'NETWORK', `ダウンロード失敗 HTTP ${response.status}`), usage }
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      return {
        ok: true,
        data: {
          base64: buffer.toString('base64'),
          mimeType: response.headers.get('content-type') ?? 'video/mp4',
        },
        usage,
      }
    } catch (error) {
      return { ok: false, error: providerError(this.id, 'NETWORK', 'ダウンロードに失敗しました', error), usage }
    }
  }

  private toState(body: RestJobResponse, fallbackId?: string): VideoJobState | null {
    const providerJobId = body.id ?? body.job_id ?? fallbackId
    if (!providerJobId) return null
    return {
      providerJobId,
      status: STATUS_MAP[(body.status ?? '').toLowerCase()] ?? 'GENERATING',
      progress: body.progress,
      videoUrl: body.video_url ?? body.videoUrl,
      error: body.error,
    }
  }
}
