import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { labelOf, SCRIPT_STYLES, SCRIPT_TONES } from '@/lib/config/taxonomy'
import { renderBrandContext, renderChannelContext, SHARED_GUARDRAILS, type BrandContext } from './context'

export const sceneOutputSchema = z.object({
  startSecond: z.number().int().min(0).max(600),
  endSecond: z.number().int().min(1).max(600),
  visual: z.string().min(1).max(600),
  voice: z.string().max(600).default(''),
  onscreenText: z.string().max(60).default(''),
  camera: z.string().max(160).default(''),
  assets: z.array(z.string().max(120)).max(6).default([]),
  /** Hook / Problem / Solution / Proof / CTA など、そのシーンの役割。 */
  purpose: z.string().max(60).default(''),
})

export const scriptOutputSchema = z.object({
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(160),
  cta: z.string().max(160).default(''),
  scenes: z.array(sceneOutputSchema).min(3).max(12),
})

export type ScriptOutput = z.infer<typeof scriptOutputSchema>

export type ScriptGenerationInput = {
  brand: BrandContext
  channel: string
  durationSec: number
  style: string
  tone: string
  hook: string | null
  idea: { title: string; category: string; summary: string; whyThisIdea: string; target: string | null; cta: string | null }
  insights: { title: string; content: string }[]
}

/** 台本生成(要件29, 30, 97)。 */
export const scriptGenerationTask: AITask<ScriptGenerationInput, ScriptOutput> = {
  id: 'scripts.generate',
  system: `あなたは Short Form Video Creative Director です。
企画を、そのまま撮影できるシーン単位の台本へ落とし込みます。

${SHARED_GUARDRAILS}
<rules>
- 冒頭3秒以内にHookを置く。前置き・自己紹介から始めない。
- シーン単位で出力する。1シーンは3〜8秒を目安にする。
- 音声(voice)と映像(visual)を一致させる。映像で見えないことを語らない。
- onscreenText(テロップ)は20文字以内を目安に短くする。読ませる文章にしない。
- 合計の尺は指定された秒数を超えない。最後のシーンの endSecond を指定尺に一致させる。
- CTAは最後のシーンに置く。冒頭で売り込まない。
- camera には画角・動きを具体的に書く(例: 手持ちミディアム、寄りのマクロ、ゆっくりプッシュイン)。
- purpose にはそのシーンの役割を1語で書く(Hook / Problem / Solution / Proof / CTA など)。
</rules>`,
  schema: scriptOutputSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      '<idea>',
      `タイトル: ${input.idea.title}`,
      `カテゴリー: ${input.idea.category}`,
      `概要: ${input.idea.summary}`,
      `この企画の狙い: ${input.idea.whyThisIdea}`,
      input.idea.target ? `ターゲット: ${input.idea.target}` : '',
      input.idea.cta ? `CTA: ${input.idea.cta}` : '',
      '</idea>',
      input.insights.length > 0
        ? `<research_insights>\n${input.insights.map((item) => `- ${item.title}: ${item.content}`).join('\n')}\n</research_insights>`
        : '',
      '<format>',
      `尺: ${input.durationSec}秒`,
      `出演スタイル: ${labelOf(SCRIPT_STYLES, input.style)}`,
      `トーン: ${labelOf(SCRIPT_TONES, input.tone)}`,
      input.hook ? `使用するHook(冒頭で必ず使う): ${input.hook}` : '',
      '</format>',
      '',
      '台本を作成してください。',
    ]
      .filter(Boolean)
      .join('\n'),
  mock: (input) => {
    const total = input.durationSec
    const cut = (ratio: number) => Math.round(total * ratio)
    const hook = input.hook ?? `${input.idea.title}、最初に見るのはここです。`
    return {
      title: input.idea.title,
      hook,
      cta: input.idea.cta ?? 'プロフィールから相談できます',
      scenes: [
        {
          startSecond: 0,
          endSecond: cut(0.12),
          visual: '対象物の寄りのカット。問題が一目で分かる状態を見せる。',
          voice: hook,
          onscreenText: '最初に見る場所',
          camera: 'マクロ寄り / ゆっくりプッシュイン',
          assets: ['対象物'],
          purpose: 'Hook',
        },
        {
          startSecond: cut(0.12),
          endSecond: cut(0.35),
          visual: '話者がカメラ目線で状況を説明。手元で対象を指し示す。',
          voice: '多くの方が見落とすポイントから説明します。',
          onscreenText: 'よくある見落とし',
          camera: '手持ちミディアム',
          assets: ['話者'],
          purpose: 'Problem',
        },
        {
          startSecond: cut(0.35),
          endSecond: cut(0.7),
          visual: '確認手順を実演。手元のアップと引きを交互に。',
          voice: '確認するのは3つだけです。順番に見ていきます。',
          onscreenText: '確認は3つ',
          camera: '手元アップ / 引きの切り返し',
          assets: ['道具', '対象物'],
          purpose: 'Solution',
        },
        {
          startSecond: cut(0.7),
          endSecond: cut(0.88),
          visual: '実施前後の比較カット。同じ画角で並べる。',
          voice: '同じ場所でも、判断が変わると結果が変わります。',
          onscreenText: '判断で変わる',
          camera: '固定 / 同一画角',
          assets: ['比較素材'],
          purpose: 'Proof',
        },
        {
          startSecond: cut(0.88),
          endSecond: total,
          visual: '話者のバストショット。最後にCTAのテロップ。',
          voice: input.idea.cta ?? '気になる方はプロフィールからご相談ください。',
          onscreenText: 'プロフィールへ',
          camera: '手持ちバストショット',
          assets: ['話者'],
          purpose: 'CTA',
        },
      ],
    }
  },
  maxTokens: 8000,
  temperature: 0.7,
}

// ── AI修正(要件33)────────────────────────────────────────────────

export type ScriptRefineInput = {
  brand: BrandContext
  channel: string
  instruction: string
  targetDurationSec: number
  current: {
    title: string
    hook: string
    cta: string | null
    scenes: { startSecond: number; endSecond: number; visual: string; voice: string; onscreenText: string | null; camera: string | null; purpose: string | null }[]
  }
}

/**
 * 既存の台本へ修正指示を適用する。
 * 台本全体を作り直すのではなく、指示された観点だけを変えることを明示する。
 */
export const scriptRefineTask: AITask<ScriptRefineInput, ScriptOutput> = {
  id: 'scripts.refine',
  system: `あなたは Short Form Video Creative Director です。
既存の台本に対して、指定された修正だけを適用します。

${SHARED_GUARDRAILS}
<rules>
- 指示された観点以外は、できる限り元の台本の内容を保持する。
- 合計の尺は指定された秒数を超えない。最後のシーンの endSecond を指定尺に一致させる。
- 冒頭3秒以内のHookは維持する(Hookを強くする指示の場合は差し替える)。
- テロップは20文字以内を目安に短く保つ。
</rules>`,
  schema: scriptOutputSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      '<current_script>',
      `タイトル: ${input.current.title}`,
      `Hook: ${input.current.hook}`,
      input.current.cta ? `CTA: ${input.current.cta}` : '',
      ...input.current.scenes.map(
        (scene, index) =>
          `Scene ${index + 1} (${scene.startSecond}-${scene.endSecond}秒) [${scene.purpose ?? '-'}]\n  映像: ${scene.visual}\n  音声: ${scene.voice}\n  テロップ: ${scene.onscreenText ?? '-'}\n  カメラ: ${scene.camera ?? '-'}`,
      ),
      '</current_script>',
      '',
      `<instruction>${input.instruction}</instruction>`,
      `<target_duration>${input.targetDurationSec}秒</target_duration>`,
      '',
      '修正後の台本を出力してください。',
    ]
      .filter(Boolean)
      .join('\n'),
  mock: (input) => {
    const total = input.targetDurationSec
    // スキーマ(最低3シーン)を満たすため、シーンを削って3件を下回った台本は
    // 末尾のCTAカットで補う。Demo Mode でも修正操作が必ず成立するようにする。
    const base = [...input.current.scenes]
    while (base.length < 3) {
      base.push({
        startSecond: 0,
        endSecond: 1,
        visual: '話者のバストショット。最後にCTAのテロップ。',
        voice: input.current.cta ?? '詳しくはプロフィールをご覧ください。',
        onscreenText: 'プロフィールへ',
        camera: '手持ちバストショット',
        purpose: 'CTA',
      })
    }

    const span = Math.max(1, Math.round(total / base.length))
    return {
      title: input.current.title,
      hook: input.current.hook,
      cta: input.current.cta ?? '',
      scenes: base.map((scene, index) => ({
        startSecond: index * span,
        endSecond: index === base.length - 1 ? total : Math.min(total, (index + 1) * span),
        visual: scene.visual,
        voice: scene.voice,
        onscreenText: scene.onscreenText ?? '',
        camera: scene.camera ?? '',
        assets: [],
        purpose: scene.purpose ?? '',
      })),
    }
  },
  maxTokens: 8000,
  temperature: 0.6,
}
