import type { ProjectContextSnapshot } from '@/types/context'

/**
 * ProjectContext を LLM 向けのテキストへ整形する。
 * 「毎回ユーザーに商品情報を入力させない」(要件79)ための共通部品。
 */
export function formatProjectContext(context: ProjectContextSnapshot): string {
  const lines: string[] = []

  lines.push(`# プロジェクト`)
  lines.push(`名称: ${context.project.name}`)
  lines.push(`現在のステージ: ${context.project.stage}`)

  if (context.product) {
    const p = context.product
    lines.push('', '# 商品概要')
    lines.push(`商品名: ${p.name}`)
    push(lines, 'カテゴリ', p.category)
    push(lines, '概要', p.description)
    push(lines, '目的', p.purpose)
    push(lines, '解決する課題', p.problem)
    push(lines, '想定ユーザー', p.target)
    push(lines, '想定価格', p.price === null ? null : `${p.price.toLocaleString('ja-JP')} ${p.currency}`)
    push(lines, '販売国', p.country)
    push(lines, '販売チャネル', p.channel)
    push(lines, 'サイズ', p.size)
    push(lines, '重量', p.weight)
    push(lines, '素材', p.material)
    push(lines, 'カラー', p.color)
    pushList(lines, '主要機能', p.features)
    pushList(lines, '差別化案', p.usp)
    pushList(lines, '未確定の項目', p.openQuestions)
  }

  if (context.market) {
    const m = context.market
    lines.push('', '# 市場データ')
    lines.push(`データ元: ${m.source}`)
    push(lines, 'マーケットプレイス', m.marketplace)
    push(lines, '検索キーワード', m.keyword)
    push(lines, '推定市場規模(円)', m.marketSize?.toLocaleString('ja-JP') ?? null)
    push(lines, '成長率', m.growthRate === null ? null : `${(m.growthRate * 100).toFixed(1)}%`)
    push(lines, '競合強度(0-100)', m.competitionScore?.toString() ?? null)
    push(lines, '平均価格', m.averagePrice?.toLocaleString('ja-JP') ?? null)
    push(
      lines,
      '価格帯',
      m.priceRange ? `${m.priceRange.min.toLocaleString('ja-JP')} 〜 ${m.priceRange.max.toLocaleString('ja-JP')}` : null,
    )
    push(lines, '要約', m.summary)
    pushList(lines, '機会', m.opportunities)
    pushList(lines, '脅威', m.threats)
  }

  if (context.competitors.length > 0) {
    lines.push('', `# 競合商品(${context.competitors.length}件)`)
    for (const competitor of context.competitors.slice(0, 20)) {
      lines.push(
        `- ${competitor.title} / ブランド:${competitor.brand ?? '不明'} / 価格:${
          competitor.price?.toLocaleString('ja-JP') ?? '不明'
        } / 評価:${competitor.rating ?? '—'}(${competitor.reviewCount ?? 0}件)`,
      )
    }
  }

  if (context.reviewClusters.length > 0) {
    lines.push('', '# レビュー分析(市場の不満ランキング)')
    for (const cluster of context.reviewClusters.slice(0, 15)) {
      lines.push(`- [${cluster.sentiment}] ${cluster.cluster} — ${(cluster.share * 100).toFixed(0)}% (${cluster.count}件) ${cluster.summary}`)
    }
  }

  if (context.score) {
    lines.push('', '# AI商品評価')
    lines.push(`合計: ${context.score.total}点 / 判定: ${context.score.decision}`)
    lines.push(`理由: ${context.score.reason}`)
    lines.push(
      `内訳: ${Object.entries(context.score.breakdown)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')}`,
    )
  }

  if (context.cost) {
    const c = context.cost
    lines.push('', '# 原価・利益シミュレーション')
    lines.push(`販売価格: ${c.sellingPrice.toLocaleString('ja-JP')}円 / 製造原価: ${c.manufacturingCost.toLocaleString('ja-JP')}円`)
    lines.push(`粗利: ${c.grossProfit.toLocaleString('ja-JP')}円 (${(c.grossProfitRate * 100).toFixed(1)}%)`)
    lines.push(`営業利益: ${c.operatingProfit.toLocaleString('ja-JP')}円 (${(c.operatingProfitRate * 100).toFixed(1)}%)`)
    lines.push(`損益分岐: ${c.breakEvenUnits.toLocaleString('ja-JP')}個 / 最大許容製造原価: ${c.maxManufacturingCost.toLocaleString('ja-JP')}円`)
  }

  if (context.specification) {
    const s = context.specification
    lines.push('', `# 商品仕様 (v${s.version})`)
    push(lines, 'サイズ', s.size)
    push(lines, '重量', s.weight)
    push(lines, '材質', s.material)
    push(lines, 'カラー', s.color)
    pushList(lines, '機能', s.features)
    pushList(lines, '付属品', s.accessories)
    push(lines, 'パッケージ', s.packaging)
  }

  if (context.oem.quotes.length > 0) {
    lines.push('', '# OEM見積')
    for (const quote of context.oem.quotes) {
      lines.push(
        `- ${quote.supplierName}: 単価 ${quote.unitPrice?.toLocaleString('ja-JP') ?? '未回答'} / MOQ ${quote.moq ?? '—'} / 納期 ${quote.leadTimeDays ?? '—'}日`,
      )
    }
  }

  if (context.sales) {
    const s = context.sales
    lines.push('', '# 販売実績')
    lines.push(`売上: ${s.revenue.toLocaleString('ja-JP')}円 / 販売数: ${s.units.toLocaleString('ja-JP')}個`)
    lines.push(`広告費: ${s.adSpend.toLocaleString('ja-JP')}円 / ACOS: ${s.acos === null ? '—' : `${(s.acos * 100).toFixed(1)}%`}`)
    lines.push(`返品率: ${s.returnRate === null ? '—' : `${(s.returnRate * 100).toFixed(1)}%`} / 評価: ${s.rating ?? '—'}`)
  }

  if (context.improvements.length > 0) {
    lines.push('', '# 改善提案')
    for (const improvement of context.improvements.slice(0, 10)) {
      lines.push(`- [${improvement.target}/${improvement.status}] ${improvement.title}`)
    }
  }

  lines.push(
    '',
    '# 生成物の状況',
    `商品画像: コンセプト${context.images.conceptCount}案 / アンカー画像${context.images.hasAnchor ? 'あり' : 'なし'} / 角度画像${context.images.angleCount}枚`,
    `LP: ${context.lp ? `v${context.lp.version}(${context.lp.sectionCount}セクション)` : '未作成'}`,
    `PR動画: ${context.videos.length}件`,
  )

  return lines.join('\n')
}

function push(lines: string[], label: string, value: string | null | undefined): void {
  if (value === null || value === undefined || value === '') return
  lines.push(`${label}: ${value}`)
}

function pushList(lines: string[], label: string, values: string[]): void {
  if (values.length === 0) return
  lines.push(`${label}: ${values.join(' / ')}`)
}

/** 共通のシステムプロンプト前文。 */
export const BASE_SYSTEM = `あなたは日本のEC市場、特にAmazon.co.jpでの商品開発・OEM製造・D2C販売に精通したシニア商品企画コンサルタントです。
株式会社MANEXIONの「AI商品開発OS」の一部として動作します。

行動原則:
- 与えられたデータに基づいて判断し、データがない点は「データなし」と明示する。推測を事実として述べない。
- 実在するブランド名・商品名をそのまま流用しない。生成する商品名・ブランド名は完全にオリジナルとする。
- 日本の関連法令(薬機法・食品表示法・景品表示法・電気用品安全法など)に触れる可能性がある場合は必ず指摘する。
- 金額はすべて日本円(税抜)、単位を明示する。
- 出力は日本語。`
