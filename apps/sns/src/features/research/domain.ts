/**
 * 調査レポートの純粋な整形ロジック。
 * DB・AI・フレームワークへ依存させず、単体テストで固定する。
 */
export type InsightRecord = {
  id: string
  category: string
  title: string
  content: string
  insightType: 'FACT' | 'INSIGHT' | 'HYPOTHESIS'
  confidence: number
  sourceIds: string[]
  metaJson: unknown
  position: number
}

export type SourceRecord = {
  id: string
  title: string
  url: string
  domain: string
  snippet: string | null
  searchQuery: string
  position: number
}

export const INSIGHT_TYPE_LABELS: Record<InsightRecord['insightType'], string> = {
  FACT: 'SOURCE FACT',
  INSIGHT: 'AI INSIGHT',
  HYPOTHESIS: 'HYPOTHESIS',
}

export const INSIGHT_TYPE_DESCRIPTIONS: Record<InsightRecord['insightType'], string> = {
  FACT: '検索した情報から確認できた事実',
  INSIGHT: '複数の情報からAIが導いた示唆',
  HYPOTHESIS: '検証が必要な仮説',
}

export function groupByCategory(insights: InsightRecord[]): Record<string, InsightRecord[]> {
  const grouped: Record<string, InsightRecord[]> = {}
  for (const insight of [...insights].sort((a, b) => a.position - b.position)) {
    const bucket = grouped[insight.category] ?? []
    bucket.push(insight)
    grouped[insight.category] = bucket
  }
  return grouped
}

/**
 * AIが返した出典番号(1始まり)を、実際に保存した出典IDへ変換する。
 * 範囲外の番号は捨てる。存在しない出典を参照させないための関門。
 */
export function resolveSourceRefs(refs: number[], sourceIds: string[]): string[] {
  const resolved: string[] = []
  for (const ref of refs) {
    const id = sourceIds[ref - 1]
    if (id && !resolved.includes(id)) resolved.push(id)
  }
  return resolved
}

/**
 * 事実(FACT)は出典が無ければ示唆(INSIGHT)へ格下げする。
 * 「ソースのない数字を事実として断定しない」(要件18, 95)をデータ側で担保する。
 */
export function normalizeInsightType(
  declared: 'fact' | 'insight' | 'hypothesis',
  sourceIds: string[],
): InsightRecord['insightType'] {
  if (declared === 'fact' && sourceIds.length === 0) return 'INSIGHT'
  return declared.toUpperCase() as InsightRecord['insightType']
}

export type ResearchExport = {
  title: string
  brandName: string
  channelLabel: string
  region: string
  objectiveLabel: string
  createdAt: Date
  summary: string | null
  insights: InsightRecord[]
  sources: SourceRecord[]
  sectionLabels: { key: string; label: string }[]
}

/** Markdown ダウンロード(要件102)。 */
export function toMarkdown(data: ResearchExport): string {
  const sourceIndex = new Map(data.sources.map((source, index) => [source.id, index + 1]))
  const grouped = groupByCategory(data.insights)

  const lines: string[] = [
    `# ${data.title}`,
    '',
    `- ブランド: ${data.brandName}`,
    `- SNS: ${data.channelLabel}`,
    `- 調査対象地域: ${data.region}`,
    `- 調査目的: ${data.objectiveLabel}`,
    `- 調査日: ${data.createdAt.toISOString().slice(0, 10)}`,
    `- 出典数: ${data.sources.length}`,
    '',
  ]

  if (data.summary) lines.push('## Executive Summary', '', data.summary, '')

  for (const section of data.sectionLabels) {
    const items = grouped[section.key]
    if (!items || items.length === 0) continue
    lines.push(`## ${section.label}`, '')
    for (const item of items) {
      const refs = item.sourceIds
        .map((id) => sourceIndex.get(id))
        .filter((index): index is number => index !== undefined)
        .map((index) => `[${index}]`)
        .join('')
      lines.push(`### ${item.title} — ${INSIGHT_TYPE_LABELS[item.insightType]}${refs ? ` ${refs}` : ''}`, '', item.content, '')
    }
  }

  if (data.sources.length > 0) {
    lines.push('## Sources', '')
    data.sources.forEach((source, index) => {
      lines.push(`${index + 1}. [${source.title}](${source.url}) — ${source.domain}`)
    })
    lines.push('')
  }

  lines.push('---', '', '※ SOURCE FACT は出典から確認できた内容、AI INSIGHT はAIによる示唆、HYPOTHESIS は検証が必要な仮説です。')
  return lines.join('\n')
}

/** 進捗表示のステージ(要件87)。 */
export const RESEARCH_STAGES = [
  { key: 'planning', label: '検索テーマを整理しています' },
  { key: 'searching', label: '情報を収集しています' },
  { key: 'analyzing', label: '競合と顧客インサイトを整理しています' },
  { key: 'composing', label: 'SNS企画につながる形へ変換しています' },
] as const

export type ResearchStageKey = (typeof RESEARCH_STAGES)[number]['key']
