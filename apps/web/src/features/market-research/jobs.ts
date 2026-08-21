import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { marketDataProviders, type MarketProduct, type MarketReview } from '@/providers/market-data'
import { runWithFallback } from '@/providers/registry'
import { runAITask } from '@/server/ai-task'
import { recordUsage } from '@/server/usage'
import { marketResearchTask } from '@/prompts/market-research'
import { competitorAnalysisTask } from '@/prompts/competitor-analysis'
import { reviewAnalysisTask } from '@/prompts/review-analysis'
import { advanceStage } from '@/features/projects/service'
import type { JobHandler } from '@/jobs/types'

const researchPayload = z.object({
  projectId: z.string(),
  researchId: z.string(),
  keyword: z.string(),
  marketplace: z.string(),
})

/** STEP 3: 市場データ取得 → AI分析 → 競合保存(要件21〜25)。 */
const runResearch: JobHandler = async (context) => {
  const payload = researchPayload.parse(context.payload)
  const registry = marketDataProviders()
  const chain = registry.chain()
  const primary = chain[0] ?? registry.get()

  await db.marketResearch.update({
    where: { id: payload.researchId },
    data: { status: 'RUNNING', source: primary.id },
  })

  try {
    await context.setProgress(10)

    const [productsOutcome, summaryOutcome] = await Promise.all([
      runWithFallback(chain, (provider) =>
        provider.searchProducts({ keyword: payload.keyword, marketplace: payload.marketplace, limit: 30 }),
      ),
      runWithFallback(chain, (provider) =>
        provider.getMarket({ keyword: payload.keyword, marketplace: payload.marketplace }),
      ),
    ])

    await recordUsage({
      organizationId: context.organizationId,
      projectId: payload.projectId,
      jobId: context.jobId,
      purpose: 'market-research.fetch',
      usage: productsOutcome.usage,
    })

    if (!productsOutcome.ok) {
      throw new AppError('PROVIDER_ERROR', `市場データの取得に失敗しました: ${productsOutcome.error.message}`)
    }

    const products = productsOutcome.data
    const summary = summaryOutcome.ok ? summaryOutcome.data : null
    await context.setProgress(35)

    const product = await db.product.findUnique({ where: { projectId: payload.projectId } })

    const research = await runAITask(
      marketResearchTask,
      {
        keyword: payload.keyword,
        productName: product?.name ?? payload.keyword,
        marketplace: payload.marketplace,
        sourceLabel: primary.sourceLabel,
        summary,
        products,
      },
      { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
    )
    await context.setProgress(60)

    const competitorAnalysis = await runAITask(
      competitorAnalysisTask,
      { productName: product?.name ?? payload.keyword, targetPrice: product?.price ?? null, products },
      { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
    )
    await context.setProgress(80)

    const analysisById = new Map(competitorAnalysis.data.competitors.map((item) => [item.externalId, item]))

    await db.$transaction(async (tx) => {
      await tx.competitorProduct.deleteMany({ where: { marketResearchId: payload.researchId } })

      for (const [index, item] of products.entries()) {
        const analysis = analysisById.get(item.externalId)
        const brand = item.brand?.trim()
        let competitorId: string | null = null

        if (brand) {
          const competitor = await tx.competitor.upsert({
            where: { projectId_brand: { projectId: payload.projectId, brand } },
            create: {
              projectId: payload.projectId,
              brand,
              strength: analysis?.strengths.join(' / ') ?? null,
              weakness: analysis?.weaknesses.join(' / ') ?? null,
            },
            update: {
              ...(analysis ? { strength: analysis.strengths.join(' / '), weakness: analysis.weaknesses.join(' / ') } : {}),
            },
          })
          competitorId = competitor.id
        }

        await tx.competitorProduct.create({
          data: {
            marketResearchId: payload.researchId,
            competitorId,
            title: item.title,
            asin: item.externalId,
            url: item.url ?? null,
            imageUrl: item.imageUrl ?? null,
            brand: item.brand ?? null,
            price: item.price ?? null,
            rating: item.rating ?? null,
            reviewCount: item.reviewCount ?? null,
            rank: item.rank ?? index + 1,
            category: item.category ?? null,
            size: item.size ?? null,
            weight: item.weight ?? null,
            seller: item.seller ?? null,
            features: item.features,
            usp: analysis?.usp ?? null,
            rawData: item.raw ? JSON.parse(JSON.stringify(item.raw)) : undefined,
          },
        })
      }

      await tx.marketResearch.update({
        where: { id: payload.researchId },
        data: {
          status: 'COMPLETED',
          marketSize: research.data.marketSize === null ? null : Math.round(research.data.marketSize),
          growthRate: research.data.growthRate,
          competitionScore: research.data.competitionScore,
          averagePrice: summary?.averagePrice ?? null,
          priceRange: summary?.priceRange ?? undefined,
          demandTrend: research.data.demandTrend,
          keywords: research.data.keywords,
          summary: research.data.summary,
          opportunities: [...research.data.opportunities, ...competitorAnalysis.data.whiteSpaces],
          threats: research.data.threats,
          snsInsights: research.data.snsInsights,
          rawData: {
            priceStrategy: research.data.priceStrategy,
            landscape: competitorAnalysis.data.landscape,
            benchmarkPrice: competitorAnalysis.data.benchmarkPrice,
            synthetic: research.synthetic,
            providerSynthetic: primary.synthetic,
          },
          completedAt: new Date(),
        },
      })
    })

    await advanceStage(payload.projectId, 'MARKET_RESEARCH')
    await context.setProgress(100)

    return { researchId: payload.researchId, competitors: products.length, synthetic: primary.synthetic }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await db.marketResearch.update({
      where: { id: payload.researchId },
      data: { status: 'FAILED', error: message },
    })
    throw error
  }
}

const reviewPayload = z.object({ projectId: z.string(), researchId: z.string() })

/** STEP 3: レビュー解析と不満クラスタリング(要件26, 27)。 */
const runReviewAnalysis: JobHandler = async (context) => {
  const payload = reviewPayload.parse(context.payload)
  const competitors = await db.competitorProduct.findMany({
    where: { marketResearchId: payload.researchId },
    orderBy: { reviewCount: 'desc' },
    take: 8,
  })
  if (competitors.length === 0) throw new Error('競合商品が登録されていません')

  const chain = marketDataProviders().chain()
  const reviews: MarketReview[] = []

  for (const [index, competitor] of competitors.entries()) {
    if (!competitor.asin) continue
    const outcome = await runWithFallback(chain, (provider) => provider.getReviews(competitor.asin ?? '', 30))
    if (outcome.ok) {
      reviews.push(...outcome.data)
    } else {
      // レビュー取得非対応のProviderがあり得るため、ここでは処理を止めない。
      logger.warn('review.fetch_skipped', { asin: competitor.asin, reason: outcome.error.kind })
    }
    await context.setProgress(((index + 1) / competitors.length) * 50)
  }

  if (reviews.length === 0) {
    throw new AppError(
      'PROVIDER_ERROR',
      '現在のデータProviderはレビュー本文を取得できません。MARKET_DATA_PROVIDER の設定を確認してください。',
    )
  }

  const product = await db.product.findUnique({ where: { projectId: payload.projectId } })
  const analysis = await runAITask(
    reviewAnalysisTask,
    { productName: product?.name ?? '対象商品', reviews },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )
  await context.setProgress(85)

  await db.$transaction([
    db.reviewInsight.deleteMany({ where: { marketResearchId: payload.researchId } }),
    db.reviewInsight.createMany({
      data: analysis.data.clusters.map((cluster) => ({
        marketResearchId: payload.researchId,
        sentiment: cluster.sentiment,
        cluster: cluster.cluster,
        summary: cluster.summary,
        share: cluster.share,
        count: cluster.count,
        keywords: cluster.keywords,
        examples: cluster.examples,
      })),
    }),
  ])

  return {
    clusters: analysis.data.clusters.length,
    reviewsAnalyzed: reviews.length,
    implications: analysis.data.productImplications,
    synthetic: analysis.synthetic,
  }
}

export const marketResearchJobHandlers: Record<string, JobHandler> = {
  'market.research': runResearch,
  'market.reviews': runReviewAnalysis,
}

export type { MarketProduct }
