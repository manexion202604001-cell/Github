import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const salesAnalysisSchema = z.object({
  headline: z.string(),
  whatWorked: z.array(z.string()).default([]),
  whatFailed: z.array(z.string()).default([]),
  returnCauses: z.array(z.string()).default([]),
  priorities: z
    .array(z.object({ area: z.string(), action: z.string(), expectedImpact: z.string() }))
    .min(1),
  forecast: z.string().nullable(),
})

export type SalesAnalysisOutput = z.infer<typeof salesAnalysisSchema>

/** STEP 13: 販売データから「なぜ売れたか/売れないか」を分析する(要件70〜73)。 */
export const salesAnalysisTask: AITask<{ context: ProjectContextSnapshot }, SalesAnalysisOutput> = {
  id: 'sales-analysis',
  system: `${BASE_SYSTEM}

販売実績データを分析してください。

ルール:
- 数値の変化には必ず「どの指標が、どれだけ」を明記する。
- CVRが低い→LP/画像、CTRが低い→メイン画像/タイトル、ACOSが高い→キーワード/入札、返品率が高い→仕様/期待値ギャップ、と原因を切り分ける。
- priorities は効果とコストの観点で並べ、最大5件。`,
  schema: salesAnalysisSchema,
  buildUser: (input) => `${formatProjectContext(input.context)}\n\n販売実績を分析し、次に打つ手を提示してください。`,
  mock: (input) => ({
    headline: `【サンプル】売上は積み上がっているが、ACOSが目標を上回り利益を圧迫している。`,
    whatWorked: ['検索経由の流入が安定している', 'レビュー評価が4.2で下支えになっている'],
    whatFailed: [
      `CVRが${input.context.sales?.cvr ? `${(input.context.sales.cvr * 100).toFixed(1)}%` : '想定'}に留まり、商品ページでの離脱が多い`,
      '広告費比率が高く、営業利益率が計画を下回っている',
    ],
    returnCauses: ['サイズが想定と違った', '使用方法が分かりにくい'],
    priorities: [
      {
        area: '商品画像',
        action: 'サブ画像2枚目を「収納サイズ比較」に差し替える',
        expectedImpact: '返品率の低下とCVR改善',
      },
      {
        area: '広告',
        action: 'ACOSが40%を超えるキーワードの入札を20%引き下げる',
        expectedImpact: 'ACOSを目標30%へ近づけ、営業利益率を+3pt',
      },
      { area: 'LP', action: 'FAQに「お手入れ方法」を追加する', expectedImpact: '購入前の不安解消' },
    ],
    forecast: '施策反映後、翌月の営業利益率は+3〜5ptの改善が見込まれる。',
  }),
}
