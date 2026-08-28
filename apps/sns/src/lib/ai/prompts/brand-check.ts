import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { renderBrandContext, SHARED_GUARDRAILS, type BrandContext } from './context'

export const brandCheckSchema = z.object({
  verdict: z.enum(['SAFE', 'WARNING', 'REVIEW']),
  findings: z
    .array(
      z.object({
        severity: z.enum(['info', 'warning', 'review']),
        /** 指摘対象の文字列(台本中の表現)。 */
        excerpt: z.string().max(200).default(''),
        issue: z.string().min(1).max(300),
        suggestion: z.string().max(300).default(''),
      }),
    )
    .max(20)
    .default([]),
  summary: z.string().max(400).default(''),
})

export type BrandCheckOutput = z.infer<typeof brandCheckSchema>

export type BrandCheckInput = {
  brand: BrandContext
  script: { title: string; hook: string; cta: string | null; scenes: { voice: string; onscreenText: string | null }[] }
}

/**
 * Brand Guard による表現チェック(要件45, 46)。
 * 法的な可否を断定せず、「確認が必要」という指摘に留める。
 */
export const brandCheckTask: AITask<BrandCheckInput, BrandCheckOutput> = {
  id: 'scripts.brand_check',
  system: `あなたは企業のブランド・表現チェック担当です。
台本の表現を、ブランドルールと一般的な広告表現の観点から確認します。

${SHARED_GUARDRAILS}
<rules>
- 法的な判断を断定しない。「〜に該当する可能性があるため確認してください」という表現にする。
- 禁止ワード・避ける表現に該当する箇所は必ず指摘する。
- 効果や成果を保証する表現(絶対に治る/必ず売れる 等)は warning 以上にする。
- 指摘には必ず代替案(suggestion)を添える。
- 問題が無ければ verdict を SAFE にし、findings は空にする。無理に指摘を作らない。
- verdict の基準: SAFE=問題なし / WARNING=修正推奨 / REVIEW=法務・専門部門の確認が必要。
</rules>`,
  schema: brandCheckSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      '<script>',
      `タイトル: ${input.script.title}`,
      `Hook: ${input.script.hook}`,
      input.script.cta ? `CTA: ${input.script.cta}` : '',
      ...input.script.scenes.map(
        (scene, index) => `Scene ${index + 1}\n  音声: ${scene.voice}\n  テロップ: ${scene.onscreenText ?? '-'}`,
      ),
      '</script>',
      '',
      'この台本の表現を確認してください。',
    ]
      .filter(Boolean)
      .join('\n'),
  mock: (input) => {
    const prohibited = input.brand.rules?.prohibitedWords ?? []
    const text = [input.script.hook, ...input.script.scenes.map((scene) => `${scene.voice} ${scene.onscreenText ?? ''}`)].join(' ')
    const hits = prohibited.filter((word) => word.length > 0 && text.includes(word))

    if (hits.length === 0) {
      return {
        verdict: 'SAFE' as const,
        findings: [],
        summary: 'ブランドルールに抵触する表現は見つかりませんでした。(Demo Mode のサンプル判定)',
      }
    }
    return {
      verdict: 'WARNING' as const,
      findings: hits.map((word) => ({
        severity: 'warning' as const,
        excerpt: word,
        issue: `「${word}」はブランドルールで禁止ワードに設定されています。`,
        suggestion: '事実の範囲で言い換えるか、条件を明示した表現へ変更してください。',
      })),
      summary: '禁止ワードの使用が見つかりました。公開前に修正してください。(Demo Mode のサンプル判定)',
    }
  },
  maxTokens: 3000,
  temperature: 0.2,
}
