import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { BASE_SYSTEM } from './context'

export const videoPromptSchema = z.object({
  prompts: z
    .array(
      z.object({
        order: z.number().int().min(1),
        prompt: z.string(),
        negativePrompt: z.string().nullable(),
        motion: z.string(),
      }),
    )
    .min(1),
})

export type VideoPromptOutput = z.infer<typeof videoPromptSchema>

export type VideoPromptInput = {
  productName: string
  productDescription: string
  aspectRatio: string
  scenes: { order: number; role: string; description: string; caption: string | null }[]
}

/**
 * ストーリーボードの各シーンを、外部動画生成AIへ渡すプロンプトへ変換する。
 * Provider固有の書式は VideoProvider Adapter 側で吸収するため、ここでは中立的な英語記述を作る。
 */
export const videoPromptTask: AITask<VideoPromptInput, VideoPromptOutput> = {
  id: 'video-prompt',
  system: `${BASE_SYSTEM}

各シーンを、動画生成AIへ渡すプロンプトへ変換してください。

ルール:
- prompt は英語。被写体・環境・光・カメラワーク・雰囲気の順で具体的に書く。
- 実在ブランド名・ロゴ・著名人を含めない。
- テロップ文字は動画生成AIに描かせない(後工程で合成する)ため、プロンプトに文字指定を含めない。
- motion には推奨するカメラ/被写体の動きを1文で。
- negativePrompt には避けたい要素(watermark, text, distorted product など)。`,
  schema: videoPromptSchema,
  buildUser: (input) =>
    `## 商品\n${input.productName}: ${input.productDescription}\nアスペクト比: ${input.aspectRatio}\n\n## シーン\n${input.scenes
      .map((scene) => `${scene.order}. [${scene.role}] ${scene.description}`)
      .join('\n')}\n\n各シーンのプロンプトを作成してください。`,
  mock: (input) => ({
    prompts: input.scenes.map((scene) => ({
      order: scene.order,
      prompt: `[SAMPLE] A modern minimal household product in a bright Japanese apartment, soft natural window light, shallow depth of field, clean composition, ${scene.role.toLowerCase()} moment, photorealistic, ${input.aspectRatio} vertical framing`,
      negativePrompt: 'watermark, text, logo, distorted product, extra hands, low resolution',
      motion: 'Slow dolly-in with a subtle parallax on the product',
    })),
  }),
}
