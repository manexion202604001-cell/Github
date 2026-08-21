import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { BASE_SYSTEM } from './context'

export const structuredProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable(),
  description: z.string().nullable(),
  purpose: z.string().nullable(),
  problem: z.string().nullable(),
  target: z.string().nullable(),
  price: z.number().int().nullable(),
  country: z.string().nullable(),
  channel: z.string().nullable(),
  size: z.string().nullable(),
  weight: z.string().nullable(),
  material: z.string().nullable(),
  color: z.string().nullable(),
  designNote: z.string().nullable(),
  features: z.array(z.string()).default([]),
  usp: z.array(z.string()).default([]),
  notes: z.string().nullable(),
})

export const interviewQuestionSchema = z.object({
  field: z.string(),
  question: z.string(),
  why: z.string(),
  examples: z.array(z.string()).default([]),
})

export const productInterviewSchema = z.object({
  product: structuredProductSchema,
  questions: z.array(interviewQuestionSchema).max(6).default([]),
  completeness: z.number().min(0).max(1),
  summary: z.string(),
})

export type ProductInterviewOutput = z.infer<typeof productInterviewSchema>

export type ProductInterviewInput = {
  rawInput: string
  existing: Record<string, unknown>
  answers: { question: string; answer: string }[]
}

/**
 * STEP 1: 自然言語の商品アイデアを構造化し、不足項目を質問に変換する(要件11〜13)。
 */
export const productInterviewTask: AITask<ProductInterviewInput, ProductInterviewOutput> = {
  id: 'product-interview',
  system: `${BASE_SYSTEM}

あなたの仕事は、ユーザーが自然言語で書いた商品アイデアを、商品開発に使える構造化データへ変換することです。

ルール:
- 書かれていない情報を創作しない。不明な項目は null にする。
- ただし category / description のようにアイデア文から確実に読み取れるものは埋める。
- 不足している重要項目は questions として最大6件、優先度順に並べる。
- questions の field は次のいずれか: name, category, description, purpose, problem, target, price, country, channel, size, weight, material, color, features, usp
- completeness は「商品企画として必要な情報がどれだけ揃っているか」を 0〜1 で示す。
- 質問は1文で、ユーザーが専門知識なしで答えられる平易な日本語にする。`,
  schema: productInterviewSchema,
  maxTokens: 6144,
  buildUser: (input) => {
    const parts = [`## ユーザーの商品アイデア\n${input.rawInput}`]
    if (Object.keys(input.existing).length > 0) {
      parts.push(`## すでに確定している項目\n${JSON.stringify(input.existing, null, 2)}`)
    }
    if (input.answers.length > 0) {
      parts.push(
        `## これまでのヒアリング\n${input.answers.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join('\n\n')}`,
      )
    }
    parts.push(`## 出力
{
  "product": { 上記スキーマの各フィールド },
  "questions": [{ "field": "...", "question": "...", "why": "...", "examples": ["..."] }],
  "completeness": 0.0〜1.0,
  "summary": "商品企画の要約を2〜3文で"
}`)
    return parts.join('\n\n')
  },
  mock: (input) => {
    const name = input.rawInput.slice(0, 24).trim() || '新商品'
    return {
      product: {
        name: `${name}(仮)`,
        category: '生活家電',
        description: input.rawInput.slice(0, 200),
        purpose: '日常の手間を減らし、限られた空間でも快適に使えるようにする',
        problem: '既存品はサイズが大きく、収納・持ち運びがしづらい',
        target: '20〜40代の単身・二人暮らし世帯',
        price: 5980,
        country: '日本',
        channel: 'Amazon.co.jp',
        size: null,
        weight: null,
        material: null,
        color: null,
        designNote: null,
        features: ['コンパクト設計', '簡単操作', '静音'],
        usp: ['収納しやすいサイズ', '手入れが簡単'],
        notes: null,
      },
      questions: [
        {
          field: 'price',
          question: '想定販売価格はいくらですか?',
          why: '価格帯によって競合と原価の上限が変わるため、最初に確定させたい項目です。',
          examples: ['3,980円', '5,980円', '9,800円'],
        },
        {
          field: 'target',
          question: '主なターゲットはどのような方ですか?',
          why: 'ターゲットによって訴求軸とデザインの方向性が変わります。',
          examples: ['一人暮らしの社会人', '子育て世帯', '出張の多いビジネスパーソン'],
        },
        {
          field: 'channel',
          question: 'Amazon.co.jpでの販売を想定していますか?',
          why: '販売チャネルによって手数料・画像規格・広告設計が変わります。',
          examples: ['Amazon.co.jpのみ', 'Amazon + 楽天', '自社EC中心'],
        },
      ],
      completeness: 0.45,
      summary:
        '【サンプル】コンパクト性と手入れのしやすさを軸にした生活家電の企画です。価格・ターゲット・販売チャネルの確定が次の論点です。',
    }
  },
}
