import { emptyUsage, providerError, type ProviderOutcome } from '../../types'
import type { VideoGenerateRequest, VideoJobState, VideoProvider } from '../types'

type MockJob = { request: VideoGenerateRequest; createdAt: number; cancelled: boolean }

const jobs = new Map<string, MockJob>()

/**
 * 外部動画生成サービス未契約でも、Storyboard → Job → 完成物の一連のフローを
 * 検証できる疑似Provider。完成物は「動くストーリーボード」としてSVGアニメーションを返す。
 */
export class MockVideoProvider implements VideoProvider {
  readonly id = 'mock'
  readonly synthetic = true

  isConfigured(): boolean {
    return true
  }

  async generate(request: VideoGenerateRequest): Promise<ProviderOutcome<VideoJobState>> {
    const providerJobId = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    jobs.set(providerJobId, { request, createdAt: Date.now(), cancelled: false })
    return {
      ok: true,
      data: { providerJobId, status: 'GENERATING', progress: 10 },
      usage: emptyUsage(this.id, 'mock-video'),
    }
  }

  async getJob(providerJobId: string): Promise<ProviderOutcome<VideoJobState>> {
    const job = jobs.get(providerJobId)
    if (!job) {
      return {
        ok: false,
        error: providerError(this.id, 'UNKNOWN', 'ジョブが見つかりません'),
        usage: emptyUsage(this.id, 'mock-video'),
      }
    }
    if (job.cancelled) {
      return { ok: true, data: { providerJobId, status: 'CANCELLED' }, usage: emptyUsage(this.id, 'mock-video') }
    }

    // 疑似的に3秒で完了させる。
    const elapsed = Date.now() - job.createdAt
    if (elapsed < 3000) {
      return {
        ok: true,
        data: { providerJobId, status: 'GENERATING', progress: Math.min(90, 10 + Math.floor(elapsed / 40)) },
        usage: emptyUsage(this.id, 'mock-video'),
      }
    }

    const asset = renderAnimatedStoryboard(job.request)
    return {
      ok: true,
      data: { providerJobId, status: 'COMPLETED', progress: 100, asset, thumbnail: asset },
      usage: { ...emptyUsage(this.id, 'mock-video'), videoSeconds: job.request.durationSec },
    }
  }

  async cancel(providerJobId: string): Promise<ProviderOutcome<VideoJobState>> {
    const job = jobs.get(providerJobId)
    if (job) job.cancelled = true
    return { ok: true, data: { providerJobId, status: 'CANCELLED' }, usage: emptyUsage(this.id, 'mock-video') }
  }

  async download(providerJobId: string): Promise<ProviderOutcome<{ base64: string; mimeType: string }>> {
    const job = jobs.get(providerJobId)
    if (!job) {
      return {
        ok: false,
        error: providerError(this.id, 'UNKNOWN', 'ジョブが見つかりません'),
        usage: emptyUsage(this.id, 'mock-video'),
      }
    }
    return { ok: true, data: renderAnimatedStoryboard(job.request), usage: emptyUsage(this.id, 'mock-video') }
  }
}

const SIZE: Record<string, { width: number; height: number }> = {
  '9:16': { width: 720, height: 1280 },
  '16:9': { width: 1280, height: 720 },
  '1:1': { width: 1000, height: 1000 },
}

function renderAnimatedStoryboard(request: VideoGenerateRequest): { base64: string; mimeType: string } {
  const { width, height } = SIZE[request.aspectRatio] ?? SIZE['1:1'] ?? { width: 1000, height: 1000 }
  const duration = Math.max(3, request.durationSec)
  const lines = wrap(request.prompt, 26).slice(0, 6)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#111111"/>
  <g opacity="0.9">
    <circle cx="${width / 2}" cy="${height * 0.36}" r="${Math.min(width, height) * 0.16}" fill="#6D4AFF">
      <animate attributeName="r" values="${Math.min(width, height) * 0.12};${Math.min(width, height) * 0.2};${Math.min(width, height) * 0.12}" dur="${duration}s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g font-family="system-ui, -apple-system, 'Hiragino Sans', sans-serif" fill="#FFFFFF" text-anchor="middle">
    <text x="${width / 2}" y="${height * 0.62}" font-size="${Math.round(width * 0.045)}" opacity="0.6">SAMPLE VIDEO</text>
    ${lines
      .map(
        (line, index) =>
          `<text x="${width / 2}" y="${height * 0.68 + index * width * 0.055}" font-size="${Math.round(width * 0.038)}" opacity="0.85">${escapeXml(line)}</text>`,
      )
      .join('\n    ')}
    <text x="${width / 2}" y="${height * 0.94}" font-size="${Math.round(width * 0.03)}" fill="#8B72E8">${duration}s / ${request.aspectRatio} — Video Provider未設定</text>
  </g>
</svg>`

  return { base64: Buffer.from(svg, 'utf8').toString('base64'), mimeType: 'image/svg+xml' }
}

function wrap(text: string, size: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  const lines: string[] = []
  for (let index = 0; index < clean.length; index += size) {
    lines.push(clean.slice(index, index + size))
  }
  return lines
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) =>
    char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '&' ? '&amp;' : char === '"' ? '&quot;' : '&apos;',
  )
}
