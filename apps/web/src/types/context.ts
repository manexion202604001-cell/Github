/**
 * AI Assistant / 各AIタスクへ渡すプロジェクト文脈(要件79, 80)。
 *
 * 重要: ここに載せるフィールドは allowlist である。
 * DBのレコードをそのまま渡さず、必要な項目だけを明示的に選ぶことで
 * 不要な個人情報がProviderへ送信されるのを防ぐ(要件111)。
 */

export type ContextProduct = {
  name: string
  category: string | null
  description: string | null
  purpose: string | null
  problem: string | null
  target: string | null
  price: number | null
  currency: string
  country: string | null
  channel: string | null
  size: string | null
  weight: string | null
  material: string | null
  color: string | null
  features: string[]
  usp: string[]
  openQuestions: string[]
  completeness: number
}

export type ContextCompetitor = {
  title: string
  brand: string | null
  price: number | null
  rating: number | null
  reviewCount: number | null
  features: string[]
}

export type ContextReviewCluster = {
  sentiment: string
  cluster: string
  summary: string
  share: number
  count: number
}

export type ContextMarket = {
  marketplace: string
  keyword: string | null
  marketSize: number | null
  growthRate: number | null
  competitionScore: number | null
  averagePrice: number | null
  priceRange: { min: number; max: number } | null
  summary: string | null
  opportunities: string[]
  threats: string[]
  source: string
}

export type ContextScore = {
  total: number
  decision: string
  reason: string
  breakdown: Record<string, number>
  improvements: string[]
}

export type ContextCost = {
  sellingPrice: number
  manufacturingCost: number
  grossProfit: number
  grossProfitRate: number
  operatingProfit: number
  operatingProfitRate: number
  breakEvenUnits: number
  maxManufacturingCost: number
  allowableAdCost: number
}

export type ContextSpecification = {
  version: number
  size: string | null
  weight: string | null
  material: string | null
  color: string | null
  features: string[]
  accessories: string[]
  packaging: string | null
}

export type ContextOEM = {
  supplierCount: number
  quotes: { supplierName: string; unitPrice: number | null; moq: number | null; leadTimeDays: number | null }[]
}

export type ContextSales = {
  periods: number
  revenue: number
  units: number
  adSpend: number
  cvr: number | null
  acos: number | null
  returnRate: number | null
  rating: number | null
}

export type ProjectContextSnapshot = {
  project: { id: string; name: string; stage: string; status: string }
  product: ContextProduct | null
  market: ContextMarket | null
  competitors: ContextCompetitor[]
  reviewClusters: ContextReviewCluster[]
  score: ContextScore | null
  cost: ContextCost | null
  specification: ContextSpecification | null
  images: { conceptCount: number; hasAnchor: boolean; angleCount: number }
  oem: ContextOEM
  lp: { version: number; headline: string | null; sectionCount: number } | null
  videos: { title: string; purpose: string; durationSec: number; sceneCount: number }[]
  sales: ContextSales | null
  improvements: { target: string; title: string; status: string }[]
}
