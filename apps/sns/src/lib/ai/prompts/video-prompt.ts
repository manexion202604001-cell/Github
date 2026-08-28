import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { channelDefinition } from '@/lib/config/channels'
import { videoPreset } from '@/lib/config/video-presets'
import { renderBrandContext, SHARED_GUARDRAILS, type BrandContext } from './context'

/** 動画生成AIへ渡すプロンプトの構造(要件36)。 */
export const videoPromptStructureSchema = z.object({
  sceneNumber: z.number().int().min(1),
  subject: z.string().min(1).max(300),
  action: z.string().min(1).max(300),
  environment: z.string().min(1).max(300),
  camera: z.string().max(200).default(''),
  shotSize: z.string().max(80).default(''),
  composition: z.string().max(160).default(''),
  lens: z.string().max(80).default(''),
  cameraMovement: z.string().max(120).default(''),
  lighting: z.string().max(160).default(''),
  mood: z.string().max(120).default(''),
  color: z.string().max(120).default(''),
  style: z.string().max(160).default(''),
  durationSeconds: z.number().int().min(1).max(60),
  aspectRatio: z.string().max(20),
  continuity: z.string().max(300).default(''),
  negativePrompt: z.string().max(400).default(''),
  /** そのままコピーして生成サービスへ貼れる本文。 */
  prompt: z.string().min(1).max(2500),
  /** 日本語の補足説明(要件39)。 */
  explanationJa: z.string().max(500).default(''),
})

export const videoPromptListSchema = z.object({
  prompts: z.array(videoPromptStructureSchema).min(1).max(12),
})

export type VideoPromptStructure = z.infer<typeof videoPromptStructureSchema>
export type VideoPromptList = z.infer<typeof videoPromptListSchema>

export type VideoPromptInput = {
  brand: BrandContext
  channel: string
  preset: string
  language: 'en' | 'ja'
  script: {
    title: string
    tone: string
    scenes: { position: number; startSecond: number; endSecond: number; visual: string; voice: string; camera: string | null; assets: string[] }[]
  }
}

/**
 * 動画生成AI用プロンプトの作成(要件35〜39)。
 * 動画そのものは生成しない。外部の動画生成APIとも通信しない。
 */
export const videoPromptTask: AITask<VideoPromptInput, VideoPromptList> = {
  id: 'scripts.video_prompt',
  system: `あなたは映像生成AIへ渡すプロンプトを設計する専門家です。
台本の各シーンを、動画生成サービスへそのまま貼り付けられるプロンプトへ変換します。

${SHARED_GUARDRAILS}
<rules>
- prompt 本文は指定された言語で書く(en 指定なら英語のみ)。
- 曖昧な形容詞ではなく、撮影可能な描写にする(何が・どこで・どう動くか)。
- 実在企業のロゴ・商標・著名人を指定しない。
- テキストやロゴを画面に入れる指示をしない(テロップは編集で入れるため)。
- negativePrompt には、破綻しやすい要素の除外を書く。
- explanationJa には、そのプロンプトが何を狙っているかを日本語1〜2文で書く。
- durationSeconds はシーンの尺に合わせる。プリセットの上限を超えない。
</rules>`,
  schema: videoPromptListSchema,
  buildUser: (input) => {
    const preset = videoPreset(input.preset)
    const channel = channelDefinition(input.channel)
    return [
      renderBrandContext(input.brand),
      `<preset name="${preset.label}">${preset.guidance}\n最大尺: ${preset.maxSeconds}秒 / 既定のNegative: ${preset.negativeDefaults.join(', ')}</preset>`,
      `<output_language>${input.language === 'en' ? 'English' : 'Japanese'}</output_language>`,
      `<aspect_ratio>${channel?.aspectRatio ?? '9:16'}</aspect_ratio>`,
      '<script>',
      `タイトル: ${input.script.title} / トーン: ${input.script.tone}`,
      ...input.script.scenes.map(
        (scene) =>
          `Scene ${scene.position} (${scene.startSecond}-${scene.endSecond}秒)\n  映像: ${scene.visual}\n  音声: ${scene.voice}\n  カメラ: ${scene.camera ?? '-'}\n  素材: ${scene.assets.join(' / ') || '-'}`,
      ),
      '</script>',
      '',
      'シーンごとにプロンプトを作成してください。',
    ].join('\n')
  },
  mock: (input) => {
    const preset = videoPreset(input.preset)
    const aspect = channelDefinition(input.channel)?.aspectRatio ?? '9:16'
    return {
      prompts: input.script.scenes.map((scene) => {
        const duration = Math.max(1, Math.min(preset.maxSeconds, scene.endSecond - scene.startSecond))
        const subject = 'Japanese professional in clean work uniform'
        const action = scene.visual
        const environment = 'Modern Japanese interior with natural daylight'
        const camera = scene.camera ?? 'Handheld medium shot'
        const negative = preset.negativeDefaults.join(', ')
        const prompt =
          input.language === 'en'
            ? [
                `Subject: ${subject}`,
                `Action: ${action}`,
                `Environment: ${environment}`,
                `Camera: ${camera}`,
                'Lighting: Bright natural commercial lighting',
                'Style: Premium commercial advertisement',
                `Aspect Ratio: ${aspect}`,
                `Duration: ${duration} seconds`,
                `Negative: ${negative}`,
              ].join('\n')
            : [
                `被写体: 清潔な作業着の日本人プロフェッショナル`,
                `動き: ${action}`,
                `環境: 自然光の入る現代的な日本の室内`,
                `カメラ: ${camera}`,
                'ライティング: 明るい自然光のコマーシャル調',
                'スタイル: 上質な企業広告',
                `画角: ${aspect}`,
                `尺: ${duration}秒`,
                `除外: ${negative}`,
              ].join('\n')

        return {
          sceneNumber: scene.position,
          subject,
          action,
          environment,
          camera,
          shotSize: 'Medium close-up',
          composition: 'Subject centered, shallow depth of field',
          lens: '35mm',
          cameraMovement: 'Slow dolly-in',
          lighting: 'Bright natural commercial lighting',
          mood: 'Trustworthy and calm',
          color: 'Clean whites with cool blue accents',
          style: 'Premium commercial advertisement',
          durationSeconds: duration,
          aspectRatio: aspect,
          continuity: 'Same subject, wardrobe and location across all scenes',
          negativePrompt: negative,
          prompt,
          explanationJa: `シーン${scene.position}の映像を生成AIで作るためのプロンプトです。(Demo Mode のサンプル)`,
        }
      }),
    }
  },
  maxTokens: 10_000,
  temperature: 0.6,
}
