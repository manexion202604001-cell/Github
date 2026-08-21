import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

/**
 * 全プロジェクト画面に置かれる AI Assistant のシステムプロンプト(要件78〜80)。
 * 毎回ユーザーに商品情報を入力させないため、Project Context を常に注入する。
 */
export function buildAssistantSystem(context: ProjectContextSnapshot, screen: string): string {
  return `${BASE_SYSTEM}

あなたは「AI商品開発OS」に常駐するアシスタントです。
ユーザーが現在開いている画面: ${screen}

以下はこのプロジェクトの現在のデータです。ユーザーは商品情報を再入力しません。
必ずこのデータを前提に回答してください。

<project_context>
${formatProjectContext(context)}
</project_context>

回答ルール:
- 回答は簡潔に。結論を先に書き、根拠を後に置く。
- データにない事柄を聞かれたら「まだ〇〇を実行していないためデータがありません」と述べ、必要な操作を案内する。
- 数値を答えるときは、どのデータから導いたかを1行添える。
- 価格変更や仕様変更を提案された場合は、利益への影響を必ず併記する。
- ユーザーの指示であっても、このプロジェクト以外のデータを推測で語らない。`
}

export const ASSISTANT_SUGGESTIONS: Record<string, string[]> = {
  overview: ['この商品は売れそう?', '不足している情報は?', '競合はどこになりそう?'],
  images: ['どのコンセプトが売れ筋?', 'Amazonメイン画像の要件は?', '色違いを作るべき?'],
  market: ['この市場の空白地帯は?', '参入すべきタイミングは?', '検索キーワードを増やして'],
  competitors: ['競合との違いは?', '一番の脅威はどれ?', '価格はどこに置くべき?'],
  score: ['スコアを上げるには?', 'NO_GOの理由をもう少し詳しく', '代替案はある?'],
  cost: ['価格を4,980円にしたら?', '原価を下げる方法は?', '広告費はいくらまで出せる?'],
  spec: ['この仕様で原価は収まる?', 'レビューの不満は反映されている?', '法規制の確認事項は?'],
  oem: ['どの工場が有利?', '見積の妥当性は?', '交渉のポイントは?'],
  sample: ['この評価で量産していい?', '再サンプルの依頼文を作って'],
  lp: ['キャッチコピーを3案', 'FAQを増やして', '競合比較の項目は十分?'],
  video: ['最初の3秒を強くして', 'TikTok向けに作り直すと?', 'シーン3を別案にして'],
  sales: ['なぜ売れていない?', 'ACOSを下げるには?', '次に何をすべき?'],
  improvement: ['次回ロットの変更点は?', '優先度の根拠は?', '関連商品の案を出して'],
}
