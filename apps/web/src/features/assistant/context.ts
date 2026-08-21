import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import type { ProjectContextSnapshot } from '@/types/context'

/**
 * Project Context を構築する(要件80)。
 *
 * ここで返すフィールドは allowlist であり、DBレコードをそのまま展開しない。
 * ユーザーの氏名・メールアドレス・組織IDなどはAIへ送らない(要件111)。
 */
export async function buildProjectContext(projectId: string): Promise<ProjectContextSnapshot> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      product: {
        include: {
          images: { where: { isAnchor: true }, take: 1 },
        },
      },
      marketResearch: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          competitors: { orderBy: { rank: 'asc' }, take: 20 },
          reviews: { orderBy: { share: 'desc' }, take: 15 },
        },
      },
      scores: { orderBy: { createdAt: 'desc' }, take: 1 },
      costSimulations: { orderBy: { updatedAt: 'desc' }, take: 1 },
      specifications: { where: { isCurrent: true }, take: 1 },
      quotes: { include: { supplier: true }, orderBy: { updatedAt: 'desc' }, take: 10 },
      landingPages: { where: { isCurrent: true }, include: { sections: true }, take: 1 },
      videoProjects: { include: { scenes: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      salesData: { orderBy: { periodStart: 'desc' }, take: 12 },
      improvements: { orderBy: { priority: 'asc' }, take: 10 },
    },
  })

  if (!project) throw AppError.notFound('プロジェクトが見つかりません')

  const product = project.product
  const research = project.marketResearch[0] ?? null
  const score = project.scores[0] ?? null
  const cost = project.costSimulations[0] ?? null
  const specification = project.specifications[0] ?? null
  const landingPage = project.landingPages[0] ?? null

  const [conceptCount, angleCount] = product
    ? await Promise.all([
        db.productImage.count({ where: { productId: product.id, type: 'CONCEPT' } }),
        db.productImage.count({ where: { productId: product.id, type: 'ANGLE' } }),
      ])
    : [0, 0]

  const sales = aggregateSales(project.salesData)

  return {
    project: { id: project.id, name: project.name, stage: project.stage, status: project.status },
    product: product
      ? {
          name: product.name,
          category: product.category,
          description: product.description,
          purpose: product.purpose,
          problem: product.problem,
          target: product.target,
          price: product.price,
          currency: product.currency,
          country: product.country,
          channel: product.channel,
          size: product.size,
          weight: product.weight,
          material: product.material,
          color: product.color,
          features: toStringArray(product.features),
          usp: toStringArray(product.usp),
          openQuestions: toStringArray(product.openQuestions).slice(0, 8),
          completeness: product.completeness,
        }
      : null,
    market: research
      ? {
          marketplace: research.marketplace,
          keyword: research.keyword,
          marketSize: research.marketSize,
          growthRate: research.growthRate,
          competitionScore: research.competitionScore,
          averagePrice: research.averagePrice,
          priceRange: parsePriceRange(research.priceRange),
          summary: research.summary,
          opportunities: toStringArray(research.opportunities),
          threats: toStringArray(research.threats),
          source: research.source,
        }
      : null,
    competitors: (research?.competitors ?? []).map((competitor) => ({
      title: competitor.title,
      brand: competitor.brand,
      price: competitor.price,
      rating: competitor.rating,
      reviewCount: competitor.reviewCount,
      features: toStringArray(competitor.features),
    })),
    reviewClusters: (research?.reviews ?? []).map((review) => ({
      sentiment: review.sentiment,
      cluster: review.cluster,
      summary: review.summary,
      share: review.share,
      count: review.count,
    })),
    score: score
      ? {
          total: score.total,
          decision: score.decision,
          reason: score.reason,
          breakdown: {
            marketDemand: score.marketDemand,
            competition: score.competition,
            differentiation: score.differentiation,
            profitability: score.profitability,
            logistics: score.logistics,
            advertising: score.advertising,
            reviewOpportunity: score.reviewOpportunity,
            expandability: score.expandability,
            risk: score.risk,
          },
          improvements: toStringArray(score.improvements).slice(0, 8),
        }
      : null,
    cost: cost
      ? {
          sellingPrice: cost.sellingPrice,
          manufacturingCost: cost.manufacturingCost,
          grossProfit: cost.grossProfit,
          grossProfitRate: cost.grossProfitRate,
          operatingProfit: cost.operatingProfit,
          operatingProfitRate: cost.operatingProfitRate,
          breakEvenUnits: cost.breakEvenUnits,
          maxManufacturingCost: cost.maxManufacturingCost,
          allowableAdCost: cost.allowableAdCost,
        }
      : null,
    specification: specification
      ? {
          version: specification.version,
          size: specification.size,
          weight: specification.weight,
          material: specification.material,
          color: specification.color,
          features: toStringArray(specification.features),
          accessories: toStringArray(specification.accessories),
          packaging: specification.packaging,
        }
      : null,
    images: {
      conceptCount,
      hasAnchor: (product?.images.length ?? 0) > 0,
      angleCount,
    },
    oem: {
      supplierCount: project.quotes.length,
      quotes: project.quotes.map((quote) => ({
        supplierName: quote.supplier.name,
        unitPrice: quote.unitPrice,
        moq: quote.moq,
        leadTimeDays: quote.leadTimeDays,
      })),
    },
    lp: landingPage
      ? { version: landingPage.version, headline: landingPage.headline, sectionCount: landingPage.sections.length }
      : null,
    videos: project.videoProjects.map((video) => ({
      title: video.title,
      purpose: video.purpose,
      durationSec: video.durationSec,
      sceneCount: video.scenes.length,
    })),
    sales,
    improvements: project.improvements.map((improvement) => ({
      target: improvement.target,
      title: improvement.title,
      status: improvement.status,
    })),
  }
}

type SalesRow = {
  revenue: number
  units: number
  adSpend: number
  sessions: number
  acos: number | null
  returns: number
  rating: number | null
}

function aggregateSales(rows: SalesRow[]): ProjectContextSnapshot['sales'] {
  if (rows.length === 0) return null

  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const units = rows.reduce((sum, row) => sum + row.units, 0)
  const adSpend = rows.reduce((sum, row) => sum + row.adSpend, 0)
  const sessions = rows.reduce((sum, row) => sum + row.sessions, 0)
  const returns = rows.reduce((sum, row) => sum + row.returns, 0)
  const ratings = rows.map((row) => row.rating).filter((value): value is number => value !== null)

  return {
    periods: rows.length,
    revenue,
    units,
    adSpend,
    cvr: sessions > 0 ? Number((units / sessions).toFixed(4)) : null,
    acos: revenue > 0 ? Number((adSpend / revenue).toFixed(4)) : null,
    returnRate: units > 0 ? Number((returns / units).toFixed(4)) : null,
    rating: ratings.length > 0 ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2)) : null,
  }
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        const label = record.item ?? record.title ?? record.label ?? record.name
        if (typeof label === 'string') return label
      }
      return null
    })
    .filter((item): item is string => item !== null)
}

function parsePriceRange(value: unknown): { min: number; max: number } | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const min = typeof record.min === 'number' ? record.min : null
  const max = typeof record.max === 'number' ? record.max : null
  return min !== null && max !== null ? { min, max } : null
}
