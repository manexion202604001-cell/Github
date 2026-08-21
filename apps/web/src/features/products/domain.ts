/**
 * 商品情報の充足度計算(純粋関数)。
 * どこまで情報が揃えば次のステップへ進めるかを一元的に定義する。
 */

export type ProductCompletenessInput = {
  name: string | null
  category: string | null
  description: string | null
  purpose: string | null
  problem: string | null
  target: string | null
  price: number | null
  country: string | null
  channel: string | null
  features: string[]
  usp: string[]
}

/** 重み付き。企画判断に効く項目ほど重い。 */
const WEIGHTS: { key: keyof ProductCompletenessInput; weight: number }[] = [
  { key: 'name', weight: 2 },
  { key: 'category', weight: 2 },
  { key: 'description', weight: 2 },
  { key: 'purpose', weight: 1 },
  { key: 'problem', weight: 2 },
  { key: 'target', weight: 2 },
  { key: 'price', weight: 3 },
  { key: 'country', weight: 1 },
  { key: 'channel', weight: 2 },
  { key: 'features', weight: 2 },
  { key: 'usp', weight: 1 },
]

function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  if (Array.isArray(value)) return value.length > 0
  return false
}

export function calculateCompleteness(input: ProductCompletenessInput): number {
  const total = WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0)
  const achieved = WEIGHTS.reduce((sum, entry) => (filled(input[entry.key]) ? sum + entry.weight : sum), 0)
  return Number((achieved / total).toFixed(3))
}

export function missingFields(input: ProductCompletenessInput): (keyof ProductCompletenessInput)[] {
  return WEIGHTS.filter((entry) => !filled(input[entry.key])).map((entry) => entry.key)
}

/** 市場調査に進むには、最低限これらが必要。 */
export function canStartMarketResearch(input: ProductCompletenessInput): boolean {
  return filled(input.name) && (filled(input.category) || filled(input.description))
}
