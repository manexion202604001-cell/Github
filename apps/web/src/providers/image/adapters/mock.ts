import { emptyUsage, type ProviderOutcome } from '../../types'
import {
  ANGLE_DEGREES,
  ANGLE_LABEL,
  IMAGE_ANGLES,
  type GeneratedImage,
  type ImageAngleId,
  type ImageEditRequest,
  type ImageGenerateRequest,
  type ImageProvider,
  type MultiAngleRequest,
} from '../types'

/**
 * 画像生成APIキー未設定でも 3案生成 → アンカー選択 → 8方向 → 360度ビュー の
 * 一連のUXが検証できるよう、決定論的なSVGモックアップを返す。
 * 同じ prompt + seed からは常に同じ絵が出る(アンカー一貫性の検証に必要)。
 */
export class MockImageProvider implements ImageProvider {
  readonly id = 'mock'
  readonly synthetic = true

  isConfigured(): boolean {
    return true
  }

  async generate(request: ImageGenerateRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    const count = request.count ?? 1
    const images: GeneratedImage[] = []
    for (let index = 0; index < count; index += 1) {
      const variant = request.variantLabels?.[index] ?? String.fromCharCode(65 + index)
      const seed = `${request.seed ?? request.prompt}#${variant}`
      images.push({
        base64: toBase64(renderSvg({ seed, caption: variant, angle: 'FRONT' })),
        mimeType: 'image/svg+xml',
        prompt: request.prompt,
        seed,
        width: 1024,
        height: 1024,
        variant,
      })
    }
    return { ok: true, data: images, usage: emptyUsage(this.id, 'mock-image') }
  }

  async variation(request: ImageGenerateRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    return this.generate(request)
  }

  async edit(request: ImageEditRequest): Promise<ProviderOutcome<GeneratedImage>> {
    const seed = `${request.seed ?? 'edit'}#${request.instruction}`
    return {
      ok: true,
      data: {
        base64: toBase64(renderSvg({ seed, caption: 'EDIT', angle: 'FRONT' })),
        mimeType: 'image/svg+xml',
        prompt: request.instruction,
        seed,
        width: 1024,
        height: 1024,
      },
      usage: emptyUsage(this.id, 'mock-image'),
    }
  }

  async multiAngle(request: MultiAngleRequest): Promise<ProviderOutcome<GeneratedImage[]>> {
    const angles = request.angles ?? IMAGE_ANGLES
    const baseSeed = request.seed ?? request.productDescription
    const images = angles.map((angle) => ({
      base64: toBase64(renderSvg({ seed: baseSeed, caption: ANGLE_LABEL[angle], angle })),
      mimeType: 'image/svg+xml',
      prompt: `${request.productDescription} / ${ANGLE_LABEL[angle]}`,
      seed: baseSeed,
      width: 1024,
      height: 1024,
      angle,
    }))
    return { ok: true, data: images, usage: emptyUsage(this.id, 'mock-image') }
  }
}

function toBase64(svg: string): string {
  return Buffer.from(svg, 'utf8').toString('base64')
}

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * seed から形状・色を決定する。角度に応じて幅と陰影が変わり、
 * 連続表示したときに回転して見える。
 */
function renderSvg(input: { seed: string; caption: string; angle: ImageAngleId }): string {
  const h = hash(input.seed)
  const hue = h % 360
  const bodyColor = `hsl(${hue} 32% 62%)`
  const bodyShadow = `hsl(${hue} 30% 44%)`
  const accent = `hsl(${(hue + 40) % 360} 45% 52%)`
  const radius = 18 + (h % 40)
  const capHeight = 60 + (h % 70)

  const degrees = ANGLE_DEGREES[input.angle]
  const radians = (degrees * Math.PI) / 180
  // 正面/背面で最も広く、側面で最も狭くなる擬似的な奥行き表現。
  const widthScale = 0.55 + 0.45 * Math.abs(Math.cos(radians))
  const bodyWidth = Math.round(300 * widthScale)
  const highlightOffset = Math.round(Math.sin(radians) * 60)
  const isBack = degrees > 90 && degrees < 270

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="product mockup ${input.caption}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F6F3FF"/>
      <stop offset="100%" stop-color="#ECE6FB"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${bodyShadow}"/>
      <stop offset="45%" stop-color="${bodyColor}"/>
      <stop offset="100%" stop-color="${bodyShadow}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <ellipse cx="512" cy="828" rx="${Math.round(bodyWidth * 0.75)}" ry="34" fill="#000" opacity="0.08"/>
  <g transform="translate(512 512)">
    <rect x="${-bodyWidth / 2}" y="-230" width="${bodyWidth}" height="530" rx="${radius}" fill="url(#body)"/>
    <rect x="${-bodyWidth / 2 + 26}" y="${-210 + capHeight}" width="${Math.max(16, bodyWidth - 52)}" height="${Math.round(150 * widthScale)}" rx="12" fill="#FFFFFF" opacity="${isBack ? 0.12 : 0.86}"/>
    ${isBack ? '' : `<circle cx="${highlightOffset}" cy="180" r="${Math.round(30 * widthScale)}" fill="${accent}" opacity="0.9"/>`}
    <rect x="${-bodyWidth / 2}" y="-230" width="${Math.max(8, Math.round(bodyWidth * 0.16))}" height="530" rx="${radius}" fill="#FFFFFF" opacity="0.14"/>
  </g>
  <g font-family="system-ui, -apple-system, 'Hiragino Sans', sans-serif" text-anchor="middle">
    <text x="512" y="915" font-size="34" fill="#111111" opacity="0.72">${escapeXml(input.caption)}</text>
    <text x="512" y="962" font-size="24" fill="#6D4AFF" opacity="0.7">SAMPLE — 画像生成Provider未設定</text>
  </g>
</svg>`
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })
}
