import { channelDefinition } from '@/lib/config/channels'
import { labelOf, SNS_GOALS } from '@/lib/config/taxonomy'

/**
 * ブランドカルテのスナップショット(要件11)。
 * ユーザーに長いプロンプトを書かせず、裏側でこの文脈を全AI処理へ渡す(要件114)。
 */
export type BrandContext = {
  name: string
  industry: string | null
  website: string | null
  region: string | null
  description: string | null
  targetCustomer: string | null
  brandTone: string | null
  snsChannels: string[]
  snsGoals: string[]
  brandKeywords: string[]
  additionalContext: string | null
  products: {
    name: string
    description: string | null
    priceRange: string | null
    strengths: string[]
    weaknesses: string[]
    differentiation: string | null
    customerProblems: string[]
    customerNeeds: string[]
    purchaseReasons: string[]
  }[]
  competitors: { name: string; website: string | null; notes: string | null }[]
  rules: {
    prohibitedWords: string[]
    preferredWords: string[]
    tone: string | null
    allowCompetitorNames: boolean
    avoidExpressions: string[]
    legalNotes: string | null
    regulatoryNotes: string | null
    internalRules: string | null
    preferredCta: string | null
  } | null
}

function list(label: string, values: string[]): string {
  return values.length > 0 ? `${label}: ${values.join(' / ')}` : ''
}

function line(label: string, value: string | null | undefined): string {
  return value ? `${label}: ${value}` : ''
}

/** AIへ渡すブランド文脈のテキスト表現。全AITaskがこれを先頭に置く。 */
export function renderBrandContext(context: BrandContext): string {
  const product = context.products
    .slice(0, 3)
    .map((item, index) =>
      [
        `【商品${index + 1}】${item.name}`,
        line('  概要', item.description),
        line('  価格帯', item.priceRange),
        list('  強み', item.strengths),
        list('  弱み', item.weaknesses),
        line('  差別化', item.differentiation),
        list('  顧客の悩み', item.customerProblems),
        list('  顧客のニーズ', item.customerNeeds),
        list('  購入理由', item.purchaseReasons),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n')

  const rules = context.rules
    ? [
        list('禁止ワード', context.rules.prohibitedWords),
        list('推奨ワード', context.rules.preferredWords),
        line('ブランドトーン', context.rules.tone),
        `競合名の言及: ${context.rules.allowCompetitorNames ? '可' : '不可'}`,
        list('避ける表現', context.rules.avoidExpressions),
        line('法務メモ', context.rules.legalNotes),
        line('規制上の注意', context.rules.regulatoryNotes),
        line('社内ルール', context.rules.internalRules),
        line('推奨CTA', context.rules.preferredCta),
      ]
        .filter(Boolean)
        .join('\n')
    : '(設定なし)'

  return [
    '<brand_context>',
    line('企業・ブランド名', context.name),
    line('業種', context.industry),
    line('Webサイト', context.website),
    line('地域', context.region),
    line('事業概要', context.description),
    line('ターゲット顧客', context.targetCustomer),
    line('ブランドトーン', context.brandTone),
    list(
      '運用SNS',
      context.snsChannels.map((key) => channelDefinition(key)?.label ?? key),
    ),
    list(
      'SNS運用目的',
      context.snsGoals.map((key) => labelOf(SNS_GOALS, key)),
    ),
    list('ブランドキーワード', context.brandKeywords),
    line('補足', context.additionalContext),
    product ? `\n${product}` : '',
    context.competitors.length > 0
      ? `\n【把握している競合】\n${context.competitors
          .map((item) => `- ${item.name}${item.website ? ` (${item.website})` : ''}${item.notes ? ` — ${item.notes}` : ''}`)
          .join('\n')}`
      : '',
    `\n【ブランドルール】\n${rules}`,
    '</brand_context>',
  ]
    .filter(Boolean)
    .join('\n')
}

/** 各SNSの文化をプロンプトへ添える(要件96)。 */
export function renderChannelContext(channelKey: string): string {
  const channel = channelDefinition(channelKey)
  if (!channel) return ''
  return `<channel_context>\nSNS: ${channel.label}\n想定尺: ${channel.durations.join(' / ')}秒\n画角: ${channel.aspectRatio}\n文化: ${channel.culture}\n</channel_context>`
}

/** 全AITask共通の禁止事項。誇大表現と成果保証を出させない(要件6, 25)。 */
export const SHARED_GUARDRAILS = `<shared_rules>
- 「バズる」「必ず売れる」「絶対に治る」など、成果や効果を保証・断定する表現を出力しないこと。
- 検索結果に無い数値・統計・企業名を、事実であるかのように書かないこと。
- 法的・医学的な断定をしないこと。懸念がある場合は「確認が必要」という表現に留めること。
- 出力は日本語。ただし動画生成AI向けプロンプトなど、英語指定がある箇所は英語。
</shared_rules>`
