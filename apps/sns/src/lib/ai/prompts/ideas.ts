import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { DIFFICULTY_KEYS, IDEA_CATEGORY_KEYS, labelOf, SNS_GOALS } from '@/lib/config/taxonomy'
import { renderBrandContext, renderChannelContext, SHARED_GUARDRAILS, type BrandContext } from './context'

export const ideaItemSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().refine((value) => IDEA_CATEGORY_KEYS.includes(value), '未対応のカテゴリー'),
  hook: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  whyThisIdea: z.string().min(1).max(600),
  target: z.string().max(200).default(''),
  cta: z.string().max(160).default(''),
  durationSec: z.number().int().min(10).max(120).default(30),
  difficulty: z.string().refine((value) => DIFFICULTY_KEYS.includes(value), '未対応の難易度'),
  /** 根拠にした調査インサイトの番号(提示した一覧の [n])。 */
  insightRefs: z.array(z.number().int().min(1)).max(6).default([]),
})

export const ideaListSchema = z.object({
  ideas: z.array(ideaItemSchema).min(1).max(30),
})

export type IdeaItem = z.infer<typeof ideaItemSchema>
export type IdeaList = z.infer<typeof ideaListSchema>

export type IdeaGenerationInput = {
  brand: BrandContext
  channel: string
  count: number
  goals: string[]
  insights: { index: number; category: string; title: string; content: string; insightType: string }[]
  opportunities: string[]
}

/** SNS企画の生成(要件22, 96)。 */
export const ideaGenerationTask: AITask<IdeaGenerationInput, IdeaList> = {
  id: 'ideas.generate',
  system: `あなたは Short Form Content Strategist です。
市場調査のインサイトを、企業SNSで実行できる企画へ変換します。

${SHARED_GUARDRAILS}
<rules>
- 調査インサイトを必ず使う。使ったインサイトの番号を insightRefs に入れる。
- 同じ企画の言い換えを量産しない。企画ごとに異なる角度(Angle)を作る。
- category は指定された分類から選び、全体で偏らせない。
- 顧客の課題(Problem)と Hook を必ずつなげる。Hookは3秒以内に言い切れる長さにする。
- 商品へ無理やり誘導しない。まず視聴者の関心に応えることを優先する。
- SNSごとの文化を踏まえる。
- difficulty は撮影の現実性で判断する(LOW: スマホ1台 / MEDIUM: 段取り必要 / HIGH: 撮影体制と素材が必要)。
</rules>`,
  schema: ideaListSchema,
  buildUser: (input) =>
    [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      `<goals>${input.goals.map((goal) => labelOf(SNS_GOALS, goal)).join(' / ') || '認知拡大'}</goals>`,
      input.insights.length > 0
        ? `<research_insights>\n${input.insights
            .map((item) => `[${item.index}] (${item.category}/${item.insightType}) ${item.title}: ${item.content}`)
            .join('\n')}\n</research_insights>`
        : '<research_insights>(調査結果なし。ブランド情報から企画を作る)</research_insights>',
      input.opportunities.length > 0 ? `<opportunities>\n${input.opportunities.map((item) => `- ${item}`).join('\n')}\n</opportunities>` : '',
      '',
      `企画を ${input.count} 件、それぞれ異なる角度で作成してください。`,
    ]
      .filter(Boolean)
      .join('\n'),
  mock: (input) => {
    const topic = input.brand.industry ?? input.brand.name
    const templates: { title: string; category: string; hook: string; difficulty: string }[] = [
      { title: `${topic}、最初に見るべき場所`, category: 'expert', hook: '実はプロが最初に見る場所があります。', difficulty: 'LOW' },
      { title: 'よくある失敗3選', category: 'mistake', hook: 'この順番でやると、やり直しになります。', difficulty: 'LOW' },
      { title: '相場の考え方', category: 'education', hook: '価格の差は、どこから生まれるのか。', difficulty: 'LOW' },
      { title: 'ビフォーアフターの中身', category: 'before_after', hook: '見た目が変わる前に、ここが変わります。', difficulty: 'MEDIUM' },
      { title: '選び方チェックリスト', category: 'checklist', hook: '依頼前に確認したい5項目。', difficulty: 'LOW' },
      { title: 'お客様からよくある質問', category: 'faq', hook: '一番多い質問に、正直に答えます。', difficulty: 'LOW' },
      { title: '作業の裏側', category: 'behind_the_scenes', hook: '当日、実際にこう動いています。', difficulty: 'MEDIUM' },
      { title: '他社との違い', category: 'comparison', hook: '同じ料金でも、範囲が違います。', difficulty: 'MEDIUM' },
      { title: '季節ごとの最適タイミング', category: 'seasonal', hook: '依頼するなら、この時期が理由あります。', difficulty: 'LOW' },
      { title: '誤解されがちなこと', category: 'myth_busting', hook: 'それ、実は逆効果かもしれません。', difficulty: 'LOW' },
    ]
    return {
      ideas: Array.from({ length: input.count }, (_, index) => {
        const template = templates[index % templates.length]!
        const round = Math.floor(index / templates.length) + 1
        return {
          title: round > 1 ? `${template.title}(角度${round})` : template.title,
          category: template.category,
          hook: template.hook,
          summary: `${topic}の検討段階にいる視聴者へ、判断基準を短く示す企画。(Demo Mode のサンプル)`,
          whyThisIdea: '検討層の不安が「判断基準の不在」に集中しているため、基準を示す発信が信頼形成に直結する。',
          target: input.brand.targetCustomer ?? '検討段階の顧客',
          cta: input.brand.rules?.preferredCta ?? 'プロフィールから相談できます',
          durationSec: 30,
          difficulty: template.difficulty,
          insightRefs: input.insights.slice(0, 1).map((item) => item.index),
        }
      }),
    }
  },
  maxTokens: 16_000,
  temperature: 0.8,
}
