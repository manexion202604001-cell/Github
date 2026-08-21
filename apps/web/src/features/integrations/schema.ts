import { z } from 'zod'

export type ModelOption = { id: string; label: string }

export const INTEGRATION_OPTIONS = [
  {
    kind: 'AI_PROVIDER',
    label: 'AI(文章生成)',
    description: '市場分析・スコアリング・LP・動画構成などの文章生成に使用します。',
    providers: [
      {
        id: 'anthropic',
        label: 'Anthropic(Claude)',
        secretLabel: 'APIキー(sk-ant-...)',
        models: [
          { id: '', label: '推奨(claude-opus-5)' },
          { id: 'claude-opus-5', label: 'Claude Opus 5 — 最高品質' },
          { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — バランス(約半額)' },
          { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — 高速・低コスト' },
        ],
      },
      {
        id: 'openai',
        label: 'OpenAI(GPT)',
        secretLabel: 'APIキー(sk-...)',
        models: [
          { id: '', label: '推奨(gpt-4.1)' },
          { id: 'gpt-5.1', label: 'GPT-5.1 — 高品質' },
          { id: 'gpt-5.1-mini', label: 'GPT-5.1 mini — 低コスト' },
          { id: 'gpt-4.1', label: 'GPT-4.1' },
        ],
      },
      {
        id: 'google',
        label: 'Google(Gemini)',
        secretLabel: 'APIキー(AIza...)',
        models: [
          { id: '', label: '推奨(gemini-2.5-flash)' },
          { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — 高品質' },
          { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — 高速・低コスト' },
        ],
      },
    ],
    hasModel: true,
  },
  {
    kind: 'IMAGE_PROVIDER',
    label: '画像生成',
    description: '商品コンセプト画像・360度画像の生成に使用します。',
    providers: [
      {
        id: 'google',
        label: 'Google(Nano Banana)',
        secretLabel: 'APIキー(AIza...)',
        models: [
          { id: '', label: '推奨(gemini-2.5-flash-image)' },
          { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image(Nano Banana)' },
        ],
      },
      {
        id: 'openai',
        label: 'OpenAI(gpt-image)',
        secretLabel: 'APIキー(sk-...)',
        models: [
          { id: '', label: '推奨(gpt-image-1)' },
          { id: 'gpt-image-1', label: 'GPT Image 1' },
        ],
      },
    ],
    hasModel: true,
  },
  {
    kind: 'MARKET_DATA',
    label: '市場データ',
    description: '市場調査・競合分析の実データ取得に使用します。楽天とAmazonの両方を登録すると、市場調査は両ソースから同時にデータを取得してマージします。Amazonはレビュー本文も取得され、不満クラスタリングが実レビューで動作します。',
    providers: [
      { id: 'rakuten', label: '楽天ウェブサービス(楽天市場)', secretLabel: 'アプリID/デベロッパーID(数字のみ・約20桁)', models: [] },
      { id: 'rainforest', label: 'Rainforest API(Amazon)', secretLabel: 'APIキー', models: [] },
    ],
    hasModel: false,
  },
] as const

export const upsertIntegrationSchema = z.object({
  kind: z.enum(['AI_PROVIDER', 'IMAGE_PROVIDER', 'MARKET_DATA']),
  provider: z.string().min(1).max(40),
  /** 省略時は保存済みのキーを維持する(モデルだけの変更を可能にする)。 */
  secret: z.string().min(4).max(500).optional(),
  model: z.string().max(120).optional(),
})

export const deleteIntegrationSchema = z.object({ id: z.string().min(1) })

export type UpsertIntegrationInput = z.infer<typeof upsertIntegrationSchema>
