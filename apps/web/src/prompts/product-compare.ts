import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { BASE_SYSTEM } from './context'

export const compareFieldSchema = z.object({
  key: z.enum([
    'name',
    'category',
    'description',
    'purpose',
    'problem',
    'target',
    'price',
    'channel',
    'features',
    'usp',
  ]),
  label: z.string(),
  userValue: z.string().nullable(),
  aiProposal: z.string(),
  evaluation: z.string(),
  better: z.enum(['USER', 'AI', 'EVEN']),
  score: z.number().min(0).max(100),
})

export const productCompareSchema = z.object({
  overallScore: z.number().min(0).max(100),
  verdict: z.string(),
  summary: z.string(),
  fields: z.array(compareFieldSchema).min(1).max(10),
})

export type ProductCompareOutput = z.infer<typeof productCompareSchema>

export type ProductCompareInput = {
  product: Record<string, unknown>
}

/**
 * 商品概要の比較評価: ユーザーが入力した各項目に対し、AIが同じ商品を
 * ゼロから企画した場合の独自案を作り、項目ごとに並べて評価する。
 */
export const productCompareTask: AITask<ProductCompareInput, ProductCompareOutput> = {
  id: 'product-compare',
  system: `${BASE_SYSTEM}

あなたの仕事は、ユーザーが入力した商品企画を「同じ商品アイデアを自分がゼロから企画したらどうするか」という独自案と並べて比較評価することです。

ルール:
- まずユーザーの入力(商品アイデア・商品名)から商品の本質を理解し、各項目についてAI独自の案を作る。ユーザーの入力の言い換えではなく、市場性・差別化・収益性の観点から本気で考えた対案にする。
- 次に項目ごとにユーザー案とAI案を比較し、どちらが優れているか(USER / AI / EVEN)と、その理由を評価コメントに書く。
- score はユーザー入力の完成度(0〜100)。未入力の項目は score 0 とし、AI案を提示する。
- userValue にはユーザーの入力をそのまま入れる。未入力なら null。
- price のような数値項目も文字列で表現する(例: "5,980円")。features / usp は「・」区切りの1つの文字列にまとめる。
- fields は重要な項目から順に並べる。対象: name, category, description, purpose, problem, target, price, channel, features, usp(入力済み+提案価値のある項目のみ、最大10件)。
- overallScore は企画全体としての完成度。verdict は1文の総評、summary は改善の方向性を2〜3文で。
- 評価は率直に。ただし攻撃的にせず、次の一手が分かる建設的な表現にする。`,
  schema: productCompareSchema,
  maxTokens: 8192,
  buildUser: (input) => `## ユーザーが入力した商品企画
${JSON.stringify(input.product, null, 2)}

## 出力
{
  "overallScore": 0〜100,
  "verdict": "1文の総評",
  "summary": "改善の方向性(2〜3文)",
  "fields": [
    {
      "key": "category",
      "label": "商品カテゴリ",
      "userValue": "ユーザーの入力 or null",
      "aiProposal": "AI独自の案",
      "evaluation": "比較コメント(なぜその判定か)",
      "better": "USER" | "AI" | "EVEN",
      "score": 0〜100
    }
  ]
}`,
  mock: (input) => {
    const name = typeof input.product.name === 'string' && input.product.name ? input.product.name : '新商品'
    return {
      overallScore: 62,
      verdict: `【サンプル】「${name}」は方向性は良いものの、差別化と価格根拠の言語化が次の課題です。`,
      summary:
        '【サンプル】ターゲットと解決する課題は明確です。一方で競合と比べた独自性(USP)と価格設定の根拠が弱いため、市場調査の結果を踏まえて肉付けすると企画の説得力が上がります。',
      fields: [
        {
          key: 'name',
          label: '商品名',
          userValue: name,
          aiProposal: `${name} Pro — 携帯保温タンブラー`,
          evaluation: '一般名詞のみの商品名は検索で埋もれやすいため、特徴を含む修飾を付けると発見性が上がります。',
          better: 'AI',
          score: 55,
        },
        {
          key: 'target',
          label: '想定ユーザー',
          userValue: (input.product.target as string | null) ?? null,
          aiProposal: '通勤・旅行の両シーンで使う25〜40代。デザイン重視でギフト需要も狙う。',
          evaluation: '利用シーンまで踏み込むと画像・LPの訴求が具体化できます。',
          better: 'EVEN',
          score: 60,
        },
        {
          key: 'price',
          label: '想定価格',
          userValue: input.product.price ? `${Number(input.product.price).toLocaleString('ja-JP')}円` : null,
          aiProposal: '3,480円(競合上位の中央値2,980円に対しデザイン差別化でプレミアム設定)',
          evaluation: '価格は競合の実勢価格と原価から逆算するのが安全です。市場調査の平均価格を根拠に使いましょう。',
          better: 'AI',
          score: 50,
        },
      ],
    }
  },
}
