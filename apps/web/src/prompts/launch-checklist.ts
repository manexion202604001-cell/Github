import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const launchChecklistSchema = z.object({
  items: z
    .array(
      z.object({
        area: z.string(),
        title: z.string(),
        detail: z.string(),
        blocking: z.boolean(),
      }),
    )
    .min(5),
  readiness: z.number().min(0).max(1),
  summary: z.string(),
})

export type LaunchChecklistOutput = z.infer<typeof launchChecklistSchema>

/** STEP 12: 販売前チェックリストを生成する(要件69)。 */
export const launchChecklistTask: AITask<{ context: ProjectContextSnapshot }, LaunchChecklistOutput> = {
  id: 'launch-checklist',
  system: `${BASE_SYSTEM}

Amazon.co.jp での販売開始前チェックリストを作成してください。

対象領域: 商品画像 / 商品タイトル / 価格 / 在庫 / 商品説明 / LP / 動画 / 広告 / SEO / OEM / 物流 / 法規
ルール:
- 現在のプロジェクトデータを見て、すでに完了している項目は blocking=false、未着手で販売に支障が出る項目は blocking=true。
- detail には「何をどうすれば完了か」を1文で書く。
- readiness は販売準備の完了度(0〜1)。`,
  schema: launchChecklistSchema,
  buildUser: (input) => `${formatProjectContext(input.context)}\n\n販売前チェックリストを作成してください。`,
  mock: (input) => ({
    items: [
      {
        area: '商品画像',
        title: 'メイン画像を白背景・商品占有率85%で用意する',
        detail: 'Amazonのメイン画像規格に合わせ、白背景の1:1画像を1枚用意します。',
        blocking: !input.context.images.hasAnchor,
      },
      {
        area: '商品タイトル',
        title: '検索キーワードを含む200文字以内のタイトルを作る',
        detail: 'ブランド名 + 主要機能 + サイズ + 用途の順で構成します。',
        blocking: true,
      },
      {
        area: '価格',
        title: '販売価格と利益率を確定する',
        detail: '利益シミュレーションの結果に基づき、価格を確定します。',
        blocking: input.context.cost === null,
      },
      {
        area: 'LP',
        title: '商品ページ(A+)の内容を確定する',
        detail: '生成済みLPをAmazon A+の枠に合わせて調整します。',
        blocking: input.context.lp === null,
      },
      {
        area: '広告',
        title: '初期キャンペーンの予算とキーワードを設定する',
        detail: '許容広告費から日予算を逆算し、指名検索と一般検索を分けて設定します。',
        blocking: false,
      },
      {
        area: '法規',
        title: '必要な表示(PSE等)を確認する',
        detail: '商品仕様の注意事項に記載された法令表示が実物とパッケージに入っているか確認します。',
        blocking: true,
      },
      {
        area: '物流',
        title: 'FBA納品プランを作成する',
        detail: '初回ロットの納品数量と納品先を確定します。',
        blocking: false,
      },
    ],
    readiness: 0.45,
    summary: '【サンプル】商品情報と価格は概ね固まっています。画像規格対応とタイトル設計が次のボトルネックです。',
  }),
}
