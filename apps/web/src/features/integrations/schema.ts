import { z } from 'zod'

export const INTEGRATION_OPTIONS = [
  {
    kind: 'AI_PROVIDER',
    label: 'AI(文章生成)',
    description: '市場分析・スコアリング・LP・動画構成などの文章生成に使用します。',
    providers: [
      { id: 'anthropic', label: 'Anthropic(Claude)', secretLabel: 'APIキー(sk-ant-...)' },
      { id: 'openai', label: 'OpenAI(GPT)', secretLabel: 'APIキー(sk-...)' },
      { id: 'google', label: 'Google(Gemini)', secretLabel: 'APIキー(AIza...)' },
    ],
    hasModel: true,
  },
  {
    kind: 'IMAGE_PROVIDER',
    label: '画像生成',
    description: '商品コンセプト画像・360度画像の生成に使用します。',
    providers: [
      { id: 'google', label: 'Google(Nano Banana)', secretLabel: 'APIキー(AIza...)' },
      { id: 'openai', label: 'OpenAI(gpt-image)', secretLabel: 'APIキー(sk-...)' },
    ],
    hasModel: true,
  },
  {
    kind: 'MARKET_DATA',
    label: '市場データ',
    description: '市場調査・競合分析の実データ取得に使用します。',
    providers: [
      { id: 'rakuten', label: '楽天ウェブサービス', secretLabel: 'アプリID(無料発行)' },
    ],
    hasModel: false,
  },
] as const

export const upsertIntegrationSchema = z.object({
  kind: z.enum(['AI_PROVIDER', 'IMAGE_PROVIDER', 'MARKET_DATA']),
  provider: z.string().min(1).max(40),
  secret: z.string().min(4).max(500),
  model: z.string().max(120).optional(),
})

export const deleteIntegrationSchema = z.object({ id: z.string().min(1) })

export type UpsertIntegrationInput = z.infer<typeof upsertIntegrationSchema>
