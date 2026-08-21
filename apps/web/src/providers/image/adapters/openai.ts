import { providerError, emptyUsage, type ProviderOutcome } from '../../types'
import { estimateImageCostMicro } from '../../ai/pricing'
import { postJson } from '../../ai/adapters/http'
import {
  ANGLE_LABEL,
  IMAGE_ANGLES,
  type GeneratedImage,
  type ImageEditRequest,
  type ImageGenerateRequest,
  type ImageProvider,
  type MultiAngleRequest,
} from '../types'

const API_URL = 'https://api.openai.com/v1/images/generations'
const DEFAULT_MODEL = 'gpt-image-1'

type OpenAIImageResponse = { data?: { b64_json?: string }[] }

const SIZE_BY_RATIO: Record<string, string> = {
  '1:1': '1024x1024',
  '4:3': '1536x1024',
  '3:4': '1024x1536',
  '16:9': '1536x1024',
  '9:16': '1024x1536',
}

export class OpenAIImageProvider implements ImageProvider {
  readonly id = 'openai'
  readonly synthetic = false

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async generate(request: ImageGenerateRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    const count = request.count ?? 1
    const size = SIZE_BY_RATIO[request.aspectRatio ?? '1:1'] ?? '1024x1024'
    const model = request.model || this.defaultModel || DEFAULT_MODEL
    const startedAt = Date.now()

    const result = await postJson(this.id, API_URL, {
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: { model, prompt: request.prompt, n: count, size },
    })

    const usage = { ...emptyUsage(this.id, model), latencyMs: Date.now() - startedAt }
    if (!result.ok) return { ok: false, error: result.error, usage }

    const body = result.body as OpenAIImageResponse
    const images = (body.data ?? [])
      .map((item, index): GeneratedImage | null =>
        item.b64_json
          ? {
              base64: item.b64_json,
              mimeType: 'image/png',
              prompt: request.prompt,
              seed: request.seed,
              variant: request.variantLabels?.[index],
            }
          : null,
      )
      .filter((image): image is GeneratedImage => image !== null)

    if (images.length === 0) {
      return { ok: false, error: providerError(this.id, 'INVALID_RESPONSE', '画像データが空でした'), usage }
    }

    return {
      ok: true,
      data: images,
      usage: { ...usage, imageCount: images.length, estimatedCostMicro: estimateImageCostMicro(this.id, images.length) },
    }
  }

  async variation(request: ImageGenerateRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    return this.generate(request)
  }

  async edit(request: ImageEditRequest): Promise<ProviderOutcome<GeneratedImage>> {
    // このAdapterは text-to-image のみを扱う。画像編集は参照画像を取れるProviderへ委譲する。
    const outcome = await this.generate({ prompt: request.instruction, count: 1, model: request.model })
    if (!outcome.ok) return outcome
    const first = outcome.data[0]
    if (!first) {
      return {
        ok: false,
        error: providerError(this.id, 'INVALID_RESPONSE', '画像データが空でした'),
        usage: outcome.usage,
      }
    }
    return { ok: true, data: first, usage: outcome.usage }
  }

  async multiAngle(request: MultiAngleRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    const angles = request.angles ?? IMAGE_ANGLES
    const images: GeneratedImage[] = []
    let cost = 0

    for (const angle of angles) {
      const outcome = await this.generate({
        prompt: `${request.productDescription}\n視点: ${ANGLE_LABEL[angle]}。白背景、商品のみ、形状と色は一貫させること。`,
        count: 1,
        model: request.model,
      })
      if (!outcome.ok) return outcome
      const first = outcome.data[0]
      if (first) {
        images.push({ ...first, angle, seed: request.seed })
        cost += outcome.usage.estimatedCostMicro
      }
    }

    return {
      ok: true,
      data: images,
      usage: {
        ...emptyUsage(this.id, request.model || this.defaultModel || DEFAULT_MODEL),
        imageCount: images.length,
        estimatedCostMicro: cost,
      },
    }
  }
}
