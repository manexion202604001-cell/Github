import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const productAnalysisSchema = z.object({
  positioning: z.string(),
  targetInsight: z.string(),
  differentiators: z.array(z.string()).min(1),
  risks: z.array(z.string()).default([]),
  suggestedKeywords: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
})

export type ProductAnalysisOutput = z.infer<typeof productAnalysisSchema>

/**
 * 構造化済みの商品情報から、ポジショニングと差別化の初期仮説を作る。
 * 市場調査の検索キーワード生成も兼ねる。
 */
export const productAnalysisTask: AITask<{ context: ProjectContextSnapshot }, ProductAnalysisOutput> = {
  id: 'product-analysis',
  system: `${BASE_SYSTEM}

商品企画の初期仮説を立ててください。
- positioning: 市場のどこに置く商品かを1〜2文で
- targetInsight: ターゲットが本当に困っていること
- differentiators: 差別化の軸を3〜5個
- risks: 想定されるリスク(規制・物流・競合)
- suggestedKeywords: Amazon検索で市場調査に使うキーワードを5〜8個(日本語、実際に検索されそうな語)
- nextActions: 次にやるべきことを3個`,
  schema: productAnalysisSchema,
  buildUser: (input) => `${formatProjectContext(input.context)}\n\n上記の商品について初期仮説を出してください。`,
  mock: (input) => ({
    positioning: `【サンプル】${input.context.product?.name ?? '本商品'}は、価格帯のボリュームゾーンに対して「省スペース」と「手入れのしやすさ」で差別化するポジションです。`,
    targetInsight: '収納場所が限られ、掃除の手間を理由に既存品の使用頻度が落ちている層が主要ターゲットです。',
    differentiators: ['収納時のサイズを競合比30%小型化', '分解して丸洗いできる構造', '運転音を50dB以下に抑制'],
    risks: ['電気用品安全法(PSE)の対象となる可能性', '軽量化と耐久性のトレードオフ'],
    suggestedKeywords: [
      input.context.product?.name ?? '新商品',
      'コンパクト 家電',
      '静音 小型',
      '一人暮らし 便利グッズ',
      '手入れ 簡単 家電',
    ],
    nextActions: ['市場調査を実行して競合価格帯を確認する', '原価の上限を逆算する', 'コンセプト画像3案を生成する'],
  }),
}
