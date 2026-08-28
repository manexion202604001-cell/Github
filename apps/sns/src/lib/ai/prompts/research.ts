import { z } from 'zod'
import type { AITask } from '@/lib/ai/task'
import { depthSettings, labelOf, RESEARCH_OBJECTIVES } from '@/lib/config/taxonomy'
import { channelLabel } from '@/lib/config/channels'
import { renderBrandContext, renderChannelContext, SHARED_GUARDRAILS, type BrandContext } from './context'

// ── 1. 検索計画(要件15)────────────────────────────────────────────

export const researchPlanSchema = z.object({
  researchQuestions: z.array(z.string().min(1).max(200)).min(3).max(10),
  searchQueries: z.array(z.string().min(1).max(120)).min(2).max(8),
  competitorQueries: z.array(z.string().min(1).max(120)).max(6).default([]),
  customerQueries: z.array(z.string().min(1).max(120)).max(6).default([]),
  trendQueries: z.array(z.string().min(1).max(120)).max(6).default([]),
})

export type ResearchPlan = z.infer<typeof researchPlanSchema>

export type ResearchPlanInput = {
  brand: BrandContext
  channel: string
  region: string
  objective: string
  depth: string
  keywords: string[]
  freeText: string | null
}

/**
 * ユーザー入力をそのまま検索せず、一度AIで検索計画へ分解する(要件15)。
 */
export const researchPlanTask: AITask<ResearchPlanInput, ResearchPlan> = {
  id: 'research.plan',
  system: `あなたは企業SNS専門の市場調査アナリストです。
与えられたブランド情報と調査依頼から、Web検索で答えを取りに行くための「検索計画」を作ります。

${SHARED_GUARDRAILS}
<rules>
- 検索クエリは実際に検索エンジンへ入力する短い語句にする。文章にしない。
- 市場動向・顧客の悩み・SNSでの話題・競合の4方向を必ずカバーする。
- ブランドの地域・業種を反映した具体的な語句にする。一般論だけのクエリにしない。
- 同義語の言い換えを並べず、異なる角度のクエリにする。
</rules>`,
  schema: researchPlanSchema,
  buildUser: (input) => {
    const depth = depthSettings(input.depth)
    return [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      '<request>',
      `調査対象地域: ${input.region}`,
      `調査目的: ${labelOf(RESEARCH_OBJECTIVES, input.objective)}`,
      `調査深度: ${depth.label}(検索クエリは合計 ${depth.queries} 件前後)`,
      input.keywords.length > 0 ? `キーワード: ${input.keywords.join(' / ')}` : '',
      input.freeText ? `依頼内容: ${input.freeText}` : '',
      '</request>',
      '',
      'この調査で答えるべき問い(researchQuestions)と、検索クエリを出力してください。',
    ]
      .filter(Boolean)
      .join('\n')
  },
  mock: (input) => {
    const seed = input.keywords[0] ?? input.brand.industry ?? input.brand.name
    const region = input.region
    return {
      researchQuestions: [
        `${seed}を検討している顧客は、何に不安を感じているか`,
        `${region}における${seed}の需要はいつ高まるか`,
        `競合は${channelLabel(input.channel)}でどんなテーマを発信しているか`,
        `まだ発信されていないテーマはどこか`,
      ],
      searchQueries: [`${seed} 市場動向`, `${seed} ${region} 需要`, `${seed} 選び方`, `${seed} 相場`],
      competitorQueries: [`${seed} 競合`, `${seed} ${channelLabel(input.channel)} 企業`],
      customerQueries: [`${seed} 悩み`, `${seed} 失敗`],
      trendQueries: [`${seed} トレンド`, `${seed} ショート動画`],
    }
  },
  maxTokens: 2000,
  temperature: 0.5,
}

// ── 2. 調査レポート(要件18, 19)──────────────────────────────────

const insightItem = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(1200),
  /** fact = 出典から確認できる事実 / insight = AIの示唆 / hypothesis = 仮説(要件18) */
  insightType: z.enum(['fact', 'insight', 'hypothesis']),
  confidence: z.number().int().min(0).max(100).default(60),
  /** 参照した出典の番号(提示した一覧の [n])。fact では必須。 */
  sourceRefs: z.array(z.number().int().min(1)).max(8).default([]),
})

const competitorItem = z.object({
  name: z.string().min(1).max(120),
  url: z.string().max(300).nullable().default(null),
  positioning: z.string().min(1).max(400),
  themes: z.array(z.string().max(120)).max(8).default([]),
  strengths: z.array(z.string().max(160)).max(6).default([]),
  weaknesses: z.array(z.string().max(160)).max(6).default([]),
  differentiationRoom: z.string().max(400).default(''),
  sourceRefs: z.array(z.number().int().min(1)).max(8).default([]),
})

const opportunityItem = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(800),
  whyNow: z.string().max(400).default(''),
  sourceRefs: z.array(z.number().int().min(1)).max(8).default([]),
})

export const researchReportSchema = z.object({
  summary: z.string().min(1).max(600),
  executiveSummary: z.array(insightItem).min(3).max(5),
  market: z.array(insightItem).min(1).max(8),
  customer: z.array(insightItem).min(1).max(8),
  sns: z.array(insightItem).min(1).max(8),
  competitors: z.array(competitorItem).max(8).default([]),
  contentGaps: z.array(insightItem).max(8).default([]),
  opportunities: z.array(opportunityItem).min(1).max(10),
})

export type ResearchReport = z.infer<typeof researchReportSchema>

export type ResearchReportInput = {
  brand: BrandContext
  channel: string
  region: string
  objective: string
  depth: string
  plan: ResearchPlan
  freeText: string | null
  sources: { index: number; title: string; url: string; domain: string; snippet: string; query: string }[]
  /** 検索が一部失敗した場合の注記。AIへ「情報が薄い領域」を伝える。 */
  searchFailures: string[]
}

/**
 * 検索結果からレポートを構成する(要件19, 95)。
 * 事実(SOURCE FACT)とAIの示唆(AI INSIGHT)・仮説(HYPOTHESIS)を必ず分ける。
 */
export const researchReportTask: AITask<ResearchReportInput, ResearchReport> = {
  id: 'research.report',
  system: `あなたは企業SNS専門の市場調査アナリストです。
与えられた検索結果だけを根拠に、SNS発信の意思決定に使える調査レポートを作ります。

${SHARED_GUARDRAILS}
<rules>
- insightType を必ず使い分ける。
  - fact: 提示された出典から確認できる内容。sourceRefs を必ず1件以上付ける。
  - insight: 複数の情報からあなたが導いた示唆。断定しない。
  - hypothesis: 検証が必要な仮説。「〜の可能性がある」と書く。
- 出典に無い数値・統計・企業名を fact として書かない。捏造は絶対に禁止。
- sourceRefs には、提示された出典一覧の番号だけを使う。存在しない番号を書かない。
- 一般論で終わらせない。必ず「このブランドがSNSで何を発信すべきか」につながる粒度まで落とす。
- 競合分析では、差別化の余地(differentiationRoom)を必ず具体的に書く。
- contentGaps には「競合があまり発信していないが、このブランドなら語れるテーマ」を書く。
- opportunities は、そのままSNS企画の起点にできるテーマにする。
</rules>`,
  schema: researchReportSchema,
  untrusted: (input) => [
    {
      label: 'web_search_results',
      content: input.sources
        .map((source) => `[${source.index}] ${source.title}\nURL: ${source.url}\n検索クエリ: ${source.query}\n抜粋: ${source.snippet}`)
        .join('\n\n')
        .slice(0, 60_000),
    },
  ],
  buildUser: (input) => {
    const depth = depthSettings(input.depth)
    return [
      renderBrandContext(input.brand),
      renderChannelContext(input.channel),
      '<request>',
      `調査対象地域: ${input.region}`,
      `調査目的: ${labelOf(RESEARCH_OBJECTIVES, input.objective)}`,
      `調査深度: ${depth.label}(インサイトは合計 ${depth.insights} 件前後)`,
      input.freeText ? `依頼内容: ${input.freeText}` : '',
      '</request>',
      '',
      '<research_questions>',
      input.plan.researchQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n'),
      '</research_questions>',
      '',
      input.searchFailures.length > 0
        ? `<note>次の検索は結果を取得できませんでした。この領域は情報が薄い前提で扱ってください: ${input.searchFailures.join(' / ')}</note>\n`
        : '',
      `検索結果は <untrusted_data label="web_search_results"> に ${input.sources.length} 件あります。`,
      'この情報だけを根拠にレポートを構成してください。',
    ]
      .filter(Boolean)
      .join('\n')
  },
  mock: (input) => {
    const topic = input.brand.industry ?? input.brand.name
    const refs = input.sources.slice(0, 2).map((source) => source.index)
    const demoNote = '(Demo Mode のサンプルです。AI_PROVIDER と SEARCH_PROVIDER を設定すると実データに置き換わります)'
    return {
      summary: `${input.region}の${topic}市場では、価格よりも「作業品質が見えないこと」への不安が意思決定の壁になっている。SNSでは作業内容の可視化と、判断基準を示すコンテンツに機会がある。${demoNote}`,
      executiveSummary: [
        {
          title: '不安の正体は「見えないこと」',
          content: `顧客は${topic}の品質を事前に判断できず、比較の軸を持てていない。作業内容を可視化する発信が信頼形成に直結する。${demoNote}`,
          insightType: 'insight' as const,
          confidence: 70,
          sourceRefs: refs,
        },
        {
          title: '検索行動は「相場」と「失敗例」に集中',
          content: `検討段階では価格相場と失敗事例が繰り返し検索されている。${demoNote}`,
          insightType: 'fact' as const,
          confidence: 60,
          sourceRefs: refs,
        },
        {
          title: '競合はビフォーアフターに偏っている',
          content: `競合の発信はビフォーアフターに集中し、選び方や判断基準の解説は手薄。${demoNote}`,
          insightType: 'insight' as const,
          confidence: 65,
          sourceRefs: refs,
        },
      ],
      market: [
        {
          title: '需要には明確な季節性がある',
          content: `${topic}の需要は季節要因で大きく変動する。繁忙期の前月から発信を始める設計が有効。${demoNote}`,
          insightType: 'hypothesis' as const,
          confidence: 50,
          sourceRefs: [],
        },
      ],
      customer: [
        {
          title: '比較しているのは価格ではなく「安心材料」',
          content: `顧客は複数社を比較する際、価格差より作業範囲と保証の明確さを見ている。${demoNote}`,
          insightType: 'insight' as const,
          confidence: 65,
          sourceRefs: refs,
        },
      ],
      sns: [
        {
          title: '発信すべきはHowToと判断基準',
          content: `HowTo・比較・失敗例の3テーマが、検討層の不安に直接答える。${demoNote}`,
          insightType: 'insight' as const,
          confidence: 70,
          sourceRefs: [],
        },
      ],
      competitors: [
        {
          name: 'デモ競合A社',
          url: null,
          positioning: `価格訴求を中心に据えた${topic}事業者。${demoNote}`,
          themes: ['ビフォーアフター', 'キャンペーン告知'],
          strengths: ['投稿頻度が高い'],
          weaknesses: ['判断基準の解説が無い'],
          differentiationRoom: '「選び方」と「作業の中身」を体系的に解説する余地がある。',
          sourceRefs: [],
        },
      ],
      contentGaps: [
        {
          title: '作業前後の「判断プロセス」',
          content: `プロが現場で何を見て判断しているかを解説する発信は、競合にほぼ無い。${demoNote}`,
          insightType: 'insight' as const,
          confidence: 60,
          sourceRefs: [],
        },
      ],
      opportunities: [
        {
          title: 'プロの判断基準を見せる',
          content: '現場で最初に確認する箇所を実演し、判断の理由まで説明する。',
          whyNow: '検討層の不安が「見えないこと」に集中しているため。',
          sourceRefs: [],
        },
        {
          title: '失敗例から入る比較コンテンツ',
          content: 'よくある失敗を提示し、回避のための確認項目を示す。',
          whyNow: '失敗例の検索需要が継続的にあるため。',
          sourceRefs: [],
        },
      ],
    }
  },
  maxTokens: 12_000,
  temperature: 0.5,
}
