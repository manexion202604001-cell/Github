/**
 * 企画スコアの純粋な計算。
 * 「AI推定評価」であり成果予測ではない(要件25)。重みはここだけで管理する。
 */
export type ScoreAxes = {
  hook: number
  relevance: number
  differentiation: number
  shareability: number
  saveability: number
  conversion: number
  brandFit: number
  feasibility: number
  brandSafety: number
}

export const SCORE_AXIS_LABELS: Record<keyof ScoreAxes, string> = {
  hook: 'Hook',
  relevance: 'ターゲット適合',
  differentiation: '差別化',
  shareability: '拡散性',
  saveability: '保存性',
  conversion: '成果接続',
  brandFit: 'ブランド適合',
  feasibility: '制作しやすさ',
  brandSafety: 'ブランド安全性',
}

/**
 * 総合スコアの重み。
 * Hook と ターゲット適合を最も重く見るのは、ショート動画では冒頭で
 * 視聴が決まり、刺さらない相手には何を出しても届かないため。
 */
const WEIGHTS: Record<keyof ScoreAxes, number> = {
  hook: 0.2,
  relevance: 0.18,
  differentiation: 0.14,
  shareability: 0.1,
  saveability: 0.1,
  conversion: 0.12,
  brandFit: 0.08,
  feasibility: 0.05,
  brandSafety: 0.03,
}

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

export function overallScore(axes: ScoreAxes): number {
  let total = 0
  for (const [key, weight] of Object.entries(WEIGHTS) as [keyof ScoreAxes, number][]) {
    total += clamp(axes[key]) * weight
  }
  // ブランド安全性が低い企画は、他が高くても上位に来ないよう上限を掛ける。
  const safety = clamp(axes.brandSafety)
  const cap = safety < 50 ? 60 : safety < 70 ? 80 : 100
  return Math.min(cap, Math.round(total))
}

export function normalizeAxes(input: Partial<ScoreAxes>): ScoreAxes {
  return {
    hook: clamp(input.hook ?? 60),
    relevance: clamp(input.relevance ?? 60),
    differentiation: clamp(input.differentiation ?? 60),
    shareability: clamp(input.shareability ?? 60),
    saveability: clamp(input.saveability ?? 60),
    conversion: clamp(input.conversion ?? 60),
    brandFit: clamp(input.brandFit ?? 60),
    feasibility: clamp(input.feasibility ?? 60),
    brandSafety: clamp(input.brandSafety ?? 60),
  }
}

export function scoreTone(value: number): 'brand' | 'positive' | 'warning' | 'neutral' {
  if (value >= 85) return 'positive'
  if (value >= 70) return 'brand'
  if (value >= 55) return 'neutral'
  return 'warning'
}

/** CSVダウンロード(要件102)。Excelで開いても崩れないようBOM付きにする。 */
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '\ufeff'
  const headers = Object.keys(rows[0]!)
  const escape = (value: string | number): string => {
    const text = String(value ?? '')
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header] ?? '')).join(','))]
  return `\ufeff${lines.join('\r\n')}`
}
