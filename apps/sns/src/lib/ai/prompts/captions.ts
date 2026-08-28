import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { channelLabel } from '@/lib/config/channels'
import { renderBrandContext, SHARED_GUARDRAILS, type BrandContext } from './context'

export const captionSchema = z.object({
  instagramCaption: z.string().max(2200).default(''),
  tiktokCaption: z.string().max(2200).default(''),
  youtubeTitle: z.string().max(100).default(''),
  description: z.string().max(2000).default(''),
  cta: z.string().max(200).default(''),
  hashtags: z.array(z.string().max(40)).max(20).default([]),
})

export type CaptionOutput = z.infer<typeof captionSchema>

export type CaptionInput = {
  brand: BrandContext
  channel: string
  script: { title: string; hook: string; cta: string | null; scenes: { voice: string }[] }
}

/** 投稿文章(要件40)。台本ページの下部から生成する補助機能。 */
export const captionTask: AITask<CaptionInput, CaptionOutput> = {
  id: 'scripts.captions',
  system: `あなたは企業SNSの投稿文を書く担当です。

${SHARED_GUARDRAILS}
<rules>
- 冒頭1行で内容が分かるようにする。長い前置きを書かない。
- ハッシュタグは関連性の高いものだけにする。無関係な人気タグを混ぜない。
- 絵文字の多用や煽り表現をしない。
- youtubeTitle は50文字以内を目安にする。
</rules>`,
  schema: captionSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      `<channel>${channelLabel(input.channel)}</channel>`,
      '<script>',
      `タイトル: ${input.script.title}`,
      `Hook: ${input.script.hook}`,
      input.script.cta ? `CTA: ${input.script.cta}` : '',
      `ナレーション: ${input.script.scenes.map((scene) => scene.voice).join(' / ')}`,
      '</script>',
      '',
      '投稿文を作成してください。',
    ]
      .filter(Boolean)
      .join('\n'),
  mock: (input) => ({
    instagramCaption: `${input.script.hook}\n\n判断の基準を3つに絞って解説しました。保存して、依頼前の確認にお使いください。(Demo Mode のサンプル)`,
    tiktokCaption: `${input.script.hook} 確認するのは3つだけ。`,
    youtubeTitle: input.script.title.slice(0, 50),
    description: `${input.script.title}について、確認すべきポイントを解説しています。`,
    cta: input.script.cta ?? 'プロフィールから相談できます',
    hashtags: ['#企業SNS', '#ショート動画', '#ノウハウ'],
  }),
  maxTokens: 2000,
  temperature: 0.7,
}
