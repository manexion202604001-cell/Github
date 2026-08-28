import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { labelOf, SCRIPT_STYLES } from '@/lib/config/taxonomy'
import { renderBrandContext, SHARED_GUARDRAILS, type BrandContext } from './context'

export const productionBriefSchema = z.object({
  cast: z.array(z.string().max(120)).max(8).default([]),
  locations: z.array(z.string().max(120)).max(8).default([]),
  equipment: z.array(z.string().max(120)).max(12).default([]),
  assets: z.array(z.string().max(120)).max(12).default([]),
  shotList: z
    .array(
      z.object({
        sceneNumber: z.number().int().min(1),
        shot: z.string().min(1).max(200),
        shotSize: z.string().max(60).default(''),
        movement: z.string().max(80).default(''),
        note: z.string().max(200).default(''),
      }),
    )
    .min(1)
    .max(20),
  shootOrder: z.array(z.string().max(160)).max(20).default([]),
  cautions: z.array(z.string().max(200)).max(10).default([]),
  captions: z.array(z.string().max(60)).max(20).default([]),
  brollIdeas: z.array(z.string().max(160)).max(12).default([]),
})

export type ProductionBriefOutput = z.infer<typeof productionBriefSchema>

export type ProductionBriefInput = {
  brand: BrandContext
  style: string
  script: {
    title: string
    durationSec: number
    scenes: { position: number; visual: string; voice: string; onscreenText: string | null; camera: string | null; assets: string[] }[]
  }
}

/** 撮影指示書(要件34)。 */
export const productionBriefTask: AITask<ProductionBriefInput, ProductionBriefOutput> = {
  id: 'scripts.production_brief',
  system: `あなたは映像制作のプロダクションマネージャーです。
台本から、撮影当日にそのまま使える指示書を作ります。

${SHARED_GUARDRAILS}
<rules>
- 実際に用意できる機材・素材だけを書く。大掛かりな機材を前提にしない。
- shootOrder は「同じ場所・同じ人でまとめて撮る」現場の効率で並べる。台本順にしない。
- cautions には、撮り直しの原因になる注意点(音・光・映り込み・権利)を書く。
- captions は台本のテロップ案を短く整える(20文字以内目安)。
</rules>`,
  schema: productionBriefSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      `<style>${labelOf(SCRIPT_STYLES, input.style)}</style>`,
      '<script>',
      `タイトル: ${input.script.title} / 尺: ${input.script.durationSec}秒`,
      ...input.script.scenes.map(
        (scene) =>
          `Scene ${scene.position}\n  映像: ${scene.visual}\n  音声: ${scene.voice}\n  テロップ: ${scene.onscreenText ?? '-'}\n  カメラ: ${scene.camera ?? '-'}\n  素材: ${scene.assets.join(' / ') || '-'}`,
      ),
      '</script>',
      '',
      '撮影指示書を作成してください。',
    ].join('\n'),
  mock: (input) => ({
    cast: ['説明担当者 1名'],
    locations: ['作業現場', '説明用の明るい室内'],
    equipment: ['スマートフォン(縦向き固定)', '三脚', 'ピンマイク', 'LEDライト1灯'],
    assets: ['対象物', '使用する道具', '比較用の素材'],
    shotList: input.script.scenes.map((scene) => ({
      sceneNumber: scene.position,
      shot: scene.visual,
      shotSize: scene.position === 1 ? 'クローズアップ' : 'ミディアム',
      movement: scene.camera ?? '固定',
      note: 'Demo Mode のサンプル指示です。',
    })),
    shootOrder: ['同一ロケの寄りカットをまとめて撮影', '話者カットをまとめて撮影', '比較カットは同一画角で最後に撮影'],
    cautions: ['作業音でナレーションが潰れないよう、音声は別録りにする', '個人情報・他社ロゴの映り込みを確認する'],
    captions: input.script.scenes.map((scene) => scene.onscreenText ?? '').filter((text) => text.length > 0),
    brollIdeas: ['道具を準備する手元', '作業前後の同一アングル', '現場へ向かう車内カット'],
  }),
  maxTokens: 6000,
  temperature: 0.5,
}
