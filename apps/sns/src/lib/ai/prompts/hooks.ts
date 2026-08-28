import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { HOOK_TYPE_KEYS } from '@/lib/config/taxonomy'
import { renderBrandContext, renderChannelContext, SHARED_GUARDRAILS, type BrandContext } from './context'

export const hookListSchema = z.object({
  hooks: z
    .array(
      z.object({
        hookType: z.string().refine((value) => HOOK_TYPE_KEYS.includes(value), '未対応のHook型'),
        text: z.string().min(1).max(120),
        rationale: z.string().max(300).default(''),
      }),
    )
    .min(5)
    .max(9),
})

export type HookList = z.infer<typeof hookListSchema>

export type HookGenerationInput = {
  brand: BrandContext
  channel: string
  idea: { title: string; category: string; summary: string; target: string | null }
}

/** Hook Generator(要件28)。台本作成前に複数パターンを提示する。 */
export const hookGenerationTask: AITask<HookGenerationInput, HookList> = {
  id: 'scripts.hooks',
  system: `あなたは Short Form Video の冒頭3秒を設計する専門家です。

${SHARED_GUARDRAILS}
<rules>
- 3秒以内に言い切れる長さにする。長い説明文にしない。
- 型(hookType)ごとに切り口を変える。同じ内容の言い換えを並べない。
- 視聴者の状況を言い当てる。company目線の宣伝文句にしない。
- 誇大表現・断定表現は使わない。
- 最低5パターン出す。
</rules>`,
  schema: hookListSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      '<idea>',
      `タイトル: ${input.idea.title}`,
      `カテゴリー: ${input.idea.category}`,
      `概要: ${input.idea.summary}`,
      input.idea.target ? `ターゲット: ${input.idea.target}` : '',
      '</idea>',
      '',
      'この企画の冒頭Hookを複数パターン作ってください。',
    ]
      .filter(Boolean)
      .join('\n'),
  mock: (input) => ({
    hooks: [
      { hookType: 'problem', text: `${input.idea.title}、実はここでつまずきます。`, rationale: '悩みを言い当てて自分ごと化させる。' },
      { hookType: 'question', text: 'これ、見たことありますか？', rationale: '問いかけで視線を止める。' },
      { hookType: 'number', text: '確認するのは、たった3つです。', rationale: '数字で情報量の少なさを保証する。' },
      { hookType: 'secret', text: 'プロが最初に見る場所があります。', rationale: '専門性への期待を作る。' },
      { hookType: 'mistake', text: 'この順番でやると、やり直しになります。', rationale: '失敗回避の動機に訴える。' },
    ],
  }),
  maxTokens: 2000,
  temperature: 0.9,
}
