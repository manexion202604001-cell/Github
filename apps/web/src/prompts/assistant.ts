import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

/**
 * AI Copilot が実行できるアクション(要件78〜80拡張)。
 * 実行は必ず features 配下の service を経由するため、認可・監査・バリデーションは既存のまま効く。
 * ここに載っていない操作(削除・発注など不可逆なもの)はチャットからは実行できない。
 */
export const assistantActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('update_product'),
    fields: z
      .object({
        name: z.string().trim().min(1).max(120),
        category: z.string().max(80),
        price: z.number().int().min(0).max(100_000_000),
        target: z.string().max(2000),
        problem: z.string().max(2000),
        channel: z.string().max(120),
        size: z.string().max(200),
        material: z.string().max(400),
        color: z.string().max(200),
      })
      .partial(),
  }),
  z.object({
    type: z.literal('start_market_research'),
    keyword: z.string().max(120).optional(),
    depth: z.enum(['QUICK', 'STANDARD', 'DEEP']).optional(),
  }),
  z.object({ type: z.literal('start_scoring') }),
  z.object({ type: z.literal('start_review_analysis') }),
])

export type AssistantAction = z.infer<typeof assistantActionSchema>

export const assistantResponseSchema = z.object({
  reply: z.string(),
  actions: z.array(assistantActionSchema).max(3).default([]),
})

export type AssistantResponse = z.infer<typeof assistantResponseSchema>

export type AssistantInput = {
  context: ProjectContextSnapshot
  screen: string
  history: { role: 'user' | 'assistant'; content: string }[]
  message: string
}

/**
 * 全プロジェクト画面に常駐する AI Copilot(要件78〜80)。
 * 相談への回答に加えて、ユーザーが明示的に指示した場合のみアクションを返す。
 * Project Context を毎回注入するため、ユーザーは商品情報を再入力しない。
 */
export const assistantTask: AITask<AssistantInput, AssistantResponse> = {
  id: 'assistant.chat',
  system: `${BASE_SYSTEM}

あなたは「UCCHAU(AI商品開発OS)」に常駐するAIコパイロットです。
プロジェクトの全データを踏まえて相談に答え、指示があればその場でデータを変更できます。

回答ルール:
- 回答(reply)は簡潔に。結論を先に書き、根拠を後に置く。
- データにない事柄を聞かれたら「まだ〇〇を実行していないためデータがありません」と述べ、必要な操作を案内する。
- 数値を答えるときは、どのデータから導いたかを1行添える。
- 価格変更や仕様変更を行う・提案する場合は、利益への影響を必ず併記する。
- このプロジェクト以外のデータを推測で語らない。

アクションのルール:
- ユーザーが変更・実行を明確に指示したときだけ actions に含める。相談や質問だけなら actions は空配列にする。
- 使えるアクションは4種類のみ:
  - update_product: 商品情報の変更(名称・カテゴリ・価格・ターゲット・課題・チャネル・サイズ・素材・色)
  - start_market_research: 市場調査の開始(keyword / depth: QUICK・STANDARD・DEEP を指定可)
  - start_scoring: 商品評価(スコアリング)の実行
  - start_review_analysis: レビュー解析の実行
- 上記にない操作(削除・発注・LP公開など)を頼まれたら、実行せず該当画面での操作を案内する。
- アクションを実行する場合、reply に「何をどう変更/開始したか」を明記する。`,
  schema: assistantResponseSchema,
  maxTokens: 4096,
  buildUser: (input) => {
    const transcript = input.history
      .slice(-12)
      .map((message) => `${message.role === 'assistant' ? 'アシスタント' : 'ユーザー'}: ${message.content}`)
      .join('\n')

    return `ユーザーが現在開いている画面: ${input.screen}

以下はこのプロジェクトの現在のデータです。必ずこのデータを前提に回答してください。

<project_context>
${formatProjectContext(input.context)}
</project_context>

## これまでの会話
${transcript || '(なし)'}

## ユーザーの新しいメッセージ
${input.message}`
  },
  mock: (input) => ({
    reply:
      '【サンプル応答】AI Providerが未設定のため、実際の分析は行っていません。設定画面でAPIキーを登録すると、プロジェクトのデータに基づいた相談と、チャットからの変更(価格変更・調査開始など)ができるようになります。\n\nご質問: ' +
      input.message.slice(0, 80),
    actions: [],
  }),
}

export const ASSISTANT_SUGGESTIONS: Record<string, string[]> = {
  overview: ['この商品は売れそう?', '価格を5,980円に変更して', '不足している情報は?'],
  images: ['どのコンセプトが売れ筋?', 'Amazonメイン画像の要件は?', '色違いを作るべき?'],
  market: ['この市場の空白地帯は?', '詳細レベルで市場調査を実行して', '参入すべきタイミングは?'],
  competitors: ['競合との違いは?', '一番の脅威はどれ?', '価格はどこに置くべき?'],
  score: ['スコアを上げるには?', '再スコアリングして', '代替案はある?'],
  cost: ['価格を4,980円にしたら?', '原価を下げる方法は?', '広告費はいくらまで出せる?'],
  spec: ['この仕様で原価は収まる?', 'レビューの不満は反映されている?', '法規制の確認事項は?'],
  oem: ['どの工場が有利?', '見積の妥当性は?', '交渉のポイントは?'],
  sample: ['この評価で量産していい?', '再サンプルの依頼文を作って'],
  lp: ['キャッチコピーを3案', 'FAQを増やして', '競合比較の項目は十分?'],
  video: ['最初の3秒を強くして', 'TikTok向けに作り直すと?', 'シーン3を別案にして'],
  sales: ['なぜ売れていない?', 'レビュー解析を実行して', '次に何をすべき?'],
  improvement: ['次回ロットの変更点は?', '優先度の根拠は?', '関連商品の案を出して'],
}
