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

const DEFAULT_MODEL = 'gemini-2.5-flash-image'

type InlineData = { mimeType?: string; data?: string }
type GooglePart = { inlineData?: InlineData; inline_data?: InlineData }
type GoogleImageResponse = { candidates?: { content?: { parts?: GooglePart[] } }[] }

/**
 * Google の画像生成モデル(Nano Banana系)。
 * 参照画像を入力に取れるため、アンカー画像を渡した多角度生成に向く(要件16, 17)。
 */
export class GoogleImageProvider implements ImageProvider {
  readonly id = 'google'
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
    const images: GeneratedImage[] = []
    let cost = 0

    for (let index = 0; index < count; index += 1) {
      const variant = request.variantLabels?.[index]
      const prompt = variant ? `${request.prompt}\n\n[Variant ${variant}]` : request.prompt
      const outcome = await this.callOnce(prompt, request.referenceImages ?? [], request.model)
      if (!outcome.ok) return outcome
      cost += outcome.usage.estimatedCostMicro
      images.push({ ...outcome.data, prompt: request.prompt, variant, seed: request.seed })
    }

    return {
      ok: true,
      data: images,
      usage: { ...emptyUsage(this.id, request.model || this.model()), imageCount: images.length, estimatedCostMicro: cost },
    }
  }

  async variation(request: ImageGenerateRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    return this.generate(request)
  }

  async edit(request: ImageEditRequest): Promise<ProviderOutcome<GeneratedImage>> {
    const outcome = await this.callOnce(
      `以下の商品画像を編集してください。元の商品の形状・アイデンティティは維持し、指示された点のみを変更すること。\n指示: ${request.instruction}`,
      [request.base],
      request.model,
    )
    if (!outcome.ok) return outcome
    return { ok: true, data: { ...outcome.data, prompt: request.instruction, seed: request.seed }, usage: outcome.usage }
  }

  async multiAngle(request: MultiAngleRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    const angles = request.angles ?? IMAGE_ANGLES
    const images: GeneratedImage[] = []
    let cost = 0

    for (const angle of angles) {
      const prompt = [
        '添付した参照画像とまったく同一の商品を、視点だけ変えて描画してください。',
        `視点: ${ANGLE_LABEL[angle]}(参照画像を基準に水平方向へ回転させた角度)`,
        '形状・比率・色・素材・ロゴ配置・ディテールは参照画像から一切変更しないこと。',
        '背景は純白(#FFFFFF)、影は真下に自然に落とす。商品以外の要素は描かない。',
        `商品説明: ${request.productDescription}`,
      ].join('\n')

      const outcome = await this.callOnce(prompt, [request.anchor], request.model)
      if (!outcome.ok) return outcome
      cost += outcome.usage.estimatedCostMicro
      images.push({ ...outcome.data, prompt, angle, seed: request.seed })
    }

    return {
      ok: true,
      data: images,
      usage: { ...emptyUsage(this.id, request.model || this.model()), imageCount: images.length, estimatedCostMicro: cost },
    }
  }

  private model(): string {
    return this.defaultModel || DEFAULT_MODEL
  }

  private async callOnce(
    prompt: string,
    references: { base64: string; mimeType: string }[],
    modelOverride?: string,
  ): Promise<ProviderOutcome<GeneratedImage>> {
    const model = modelOverride || this.model()
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
    const startedAt = Date.now()

    const parts: Record<string, unknown>[] = [
      ...references.map((reference) => ({
        inline_data: { mime_type: reference.mimeType, data: reference.base64 },
      })),
      { text: prompt },
    ]

    const result = await postJson(this.id, url, {
      headers: { 'x-goog-api-key': this.apiKey },
      body: { contents: [{ role: 'user', parts }] },
    })

    const usage = {
      ...emptyUsage(this.id, model),
      imageCount: 1,
      estimatedCostMicro: estimateImageCostMicro(this.id, 1),
      latencyMs: Date.now() - startedAt,
    }

    if (!result.ok) return { ok: false, error: result.error, usage: { ...usage, imageCount: 0, estimatedCostMicro: 0 } }

    const body = result.body as GoogleImageResponse
    const found = (body.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.inlineData ?? part.inline_data)
      .find((data): data is InlineData => typeof data?.data === 'string')

    if (!found?.data) {
      return {
        ok: false,
        error: providerError(this.id, 'INVALID_RESPONSE', '画像データを含まない応答を受け取りました'),
        usage: { ...usage, imageCount: 0, estimatedCostMicro: 0 },
      }
    }

    return {
      ok: true,
      data: { base64: found.data, mimeType: found.mimeType ?? 'image/png', prompt },
      usage,
    }
  }
}
