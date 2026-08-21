import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

const SECTION_KINDS = [
  'HERO',
  'PROBLEM',
  'PRODUCT',
  'FEATURES',
  'BENEFITS',
  'HOW_TO_USE',
  'COMPARISON',
  'REVIEWS',
  'FAQ',
  'CTA',
  'CUSTOM',
] as const

export const lpGenerationSchema = z.object({
  title: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  sections: z
    .array(
      z.object({
        kind: z.enum(SECTION_KINDS),
        title: z.string().nullable(),
        subtitle: z.string().nullable(),
        body: z.string().nullable(),
        items: z
          .array(z.object({ label: z.string(), value: z.string().nullable() }))
          .default([]),
        ctaLabel: z.string().nullable(),
        imageHint: z.string().nullable(),
      }),
    )
    .min(6),
})

export type LPGenerationOutput = z.infer<typeof lpGenerationSchema>

/** STEP 10: 商品情報・市場分析・レビューからLPを生成する(要件51〜54)。 */
export const lpGenerationTask: AITask<{ context: ProjectContextSnapshot }, LPGenerationOutput> = {
  id: 'lp-generation',
  system: `${BASE_SYSTEM}

商品販売用のランディングページを構成してください。

構成(この順序で必ず含める):
HERO → PROBLEM → PRODUCT → FEATURES → BENEFITS → HOW_TO_USE → COMPARISON → REVIEWS → FAQ → CTA

ルール:
- headline は30文字以内、ベネフィットを1文で言い切る。誇大表現・最上級表現(「No.1」「絶対」)は使わない。
- PROBLEM セクションは、レビュー分析で判明した市場の不満をそのまま顧客の悩みとして書く。
- COMPARISON の items は「比較項目: 自社の値」の形式。
- REVIEWS は「想定される購入者の声」であることが分かる書き方にし、実在レビューの引用はしない。
- FAQ は購入前の不安(サイズ・手入れ・保証・電気代)に答える5問。
- 薬機法・景品表示法に抵触する効果効能の断定を避ける。
- imageHint には、そのセクションに置くべき画像の内容を1文で書く。`,
  schema: lpGenerationSchema,
  maxTokens: 12288,
  buildUser: (input) => `${formatProjectContext(input.context)}\n\n上記の商品のLPを作成してください。`,
  mock: (input) => {
    const name = input.context.product?.name ?? '新商品'
    const price = input.context.product?.price ?? 5980
    return {
      title: `${name} 商品LP`,
      headline: '置き場所に、悩まない。',
      subheadline: `収納時の高さ150mm。分解して丸洗いできる、毎日つかえる${name}。`,
      sections: [
        {
          kind: 'HERO' as const,
          title: '置き場所に、悩まない。',
          subtitle: `収納時150mm / 分解洗浄対応 / 運転音50dB以下`,
          body: null,
          items: [],
          ctaLabel: 'いますぐ購入する',
          imageHint: '白背景の商品正面カット。右下に収納状態の小カットを重ねる。',
        },
        {
          kind: 'PROBLEM' as const,
          title: 'こんな不満、ありませんか?',
          subtitle: null,
          body: '「掃除がしづらい」「音が気になる」「置き場所がない」——同カテゴリの購入者レビューで最も多く挙がるのは、性能ではなく毎日の使い勝手に関する不満でした。',
          items: [
            { label: '掃除しづらい', value: '36%' },
            { label: '音がうるさい', value: '25%' },
            { label: '大きい', value: '18%' },
          ],
          imageHint: '困っている生活シーンの写真',
          ctaLabel: null,
        },
        {
          kind: 'PRODUCT' as const,
          title: `${name}という答え`,
          subtitle: null,
          body: '使い勝手の不満を起点に設計し直しました。毎日つかうものだからこそ、片付けやすさと静かさを最優先にしています。',
          items: [],
          ctaLabel: null,
          imageHint: '商品を実際に使っている生活シーン',
        },
        {
          kind: 'FEATURES' as const,
          title: '3つの特徴',
          subtitle: null,
          body: null,
          items: [
            { label: '分解洗浄構造', value: '工具なしで3パーツに分解、丸洗いできます' },
            { label: '静音設計', value: '運転音50dB以下。在宅ワーク中でも気になりません' },
            { label: '折りたたみ収納', value: '収納時の高さ150mm。棚下にも収まります' },
          ],
          ctaLabel: null,
          imageHint: '各特徴のクローズアップ3点',
        },
        {
          kind: 'BENEFITS' as const,
          title: '暮らしがどう変わるか',
          subtitle: null,
          body: '片付けの手間が減り、使う回数が増える。結果として、買ったのに使わない家電になりません。',
          items: [],
          ctaLabel: null,
          imageHint: 'すっきりした収納棚の写真',
        },
        {
          kind: 'HOW_TO_USE' as const,
          title: '使い方は3ステップ',
          subtitle: null,
          body: null,
          items: [
            { label: 'STEP 1', value: 'タンクに水を入れる' },
            { label: 'STEP 2', value: '電源ボタンを押す' },
            { label: 'STEP 3', value: '使用後は分解して洗う' },
          ],
          ctaLabel: null,
          imageHint: '3ステップの図解',
        },
        {
          kind: 'COMPARISON' as const,
          title: '他社製品との比較',
          subtitle: null,
          body: null,
          items: [
            { label: '収納時の高さ', value: '150mm' },
            { label: '分解洗浄', value: '対応' },
            { label: '運転音', value: '50dB以下' },
            { label: '重量', value: '約1.2kg' },
          ],
          ctaLabel: null,
          imageHint: '比較表',
        },
        {
          kind: 'REVIEWS' as const,
          title: 'ご購入いただいた方の声(想定)',
          subtitle: null,
          body: null,
          items: [
            { label: '30代・一人暮らし', value: '棚の下に収まるので、出しっぱなしにならなくなりました。' },
            { label: '40代・二人暮らし', value: '洗えるのが決め手でした。清潔に使えています。' },
          ],
          ctaLabel: null,
          imageHint: 'レビューカードのデザイン',
        },
        {
          kind: 'FAQ' as const,
          title: 'よくあるご質問',
          subtitle: null,
          body: null,
          items: [
            { label: 'お手入れはどうすればいいですか?', value: '工具なしで3パーツに分解し、水洗いできます。' },
            { label: 'サイズを教えてください', value: 'W180 × D120 × H240mm、収納時はH150mmです。' },
            { label: '保証はありますか?', value: 'ご購入から1年間のメーカー保証が付きます。' },
            { label: '電気代はどのくらいですか?', value: '消費電力400W。1日30分の使用で月あたり約60円が目安です。' },
            { label: '交換部品は買えますか?', value: '専用フィルターを別売でご用意しています。' },
          ],
          ctaLabel: null,
          imageHint: null,
        },
        {
          kind: 'CTA' as const,
          title: '置き場所に悩まない毎日へ',
          subtitle: `${price.toLocaleString('ja-JP')}円(税込)`,
          body: null,
          items: [],
          ctaLabel: 'カートに入れる',
          imageHint: '商品の正面カットと価格',
        },
      ],
    }
  },
}
