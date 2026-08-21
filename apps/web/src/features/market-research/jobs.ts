import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { estimateCompetitionScore, summarizePrices, type MarketDataProvider, type MarketProduct, type MarketReview, type MarketSummary } from '@/providers/market-data'
import { marketDataChainFor } from '@/server/org-providers'
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

/**
 * 複数ソースから商品を集めてマージする。
 * ソース間で公平になるよう、各ソースの上位から交互に採用する。
 */
async function fetchFromAllSources(
  providers: MarketDataProvider[],
  keyword: string,
  marketplace: string,
  perSourceLimit: number,
): Promise<{ products: MarketProduct[]; usedSources: MarketDataProvider[]; errors: string[] }> {
  const results = await Promise.all(
    providers.map(async (provider) => ({
      provider,
      outcome: await provider.searchProducts({ keyword, marketplace, limit: perSourceLimit }),
    })),
  )

  const perSource: { provider: MarketDataProvider; products: MarketProduct[] }[] = []
  const errors: string[] = []
  for (const { provider, outcome } of results) {
    if (outcome.ok) {
      perSource.push({
        provider,
        products: outcome.data.map((product) => ({
          ...product,
          raw: { ...(typeof product.raw === 'object' && product.raw !== null ? product.raw : {}), _source: provider.id },
        })),
      })
    } else {
      errors.push(`${provider.sourceLabel}: ${outcome.error.message}`)
    }
  }

  // 各ソースの上位から交互に採用(Amazon→楽天→Amazon→…)
  const merged: MarketProduct[] = []
  const maxLength = Math.max(0, ...perSource.map((entry) => entry.products.length))
  for (let index = 0; index < maxLength; index += 1) {
    for (const entry of perSource) {
      const product = entry.products[index]
      if (product) merged.push({ ...product, rank: merged.length + 1 })
    }
  }

  return { products: merged, usedSources: perSource.map((entry) => entry.provider), errors }
}

/** STEP 3: 市場データ取得(複数ソース併用)→ AI分析 → 競合保存(要件21〜25)。 */
const runResearch: JobHandler = async (context) => {
  const payload = researchPayload.parse(context.payload)
  const chain = await marketDataChainFor(context.organizationId)
  // 実データProviderが1つでもあれば全部使う。無ければmock1本。
  const realProviders = chain.filter((provider) => !provider.synthetic)
  const fetchTargets = realProviders.length > 0 ? realProviders : chain.slice(0, 1)
  const primary = fetchTargets[0]
  if (!primary) throw new Error('市場データProviderが利用できません')

  await db.marketResearch.update({
    where: { id: payload.researchId },
    data: { status: 'RUNNING', source: fetchTargets.map((provider) => provider.id).join('+') },
  })

  try {
    await context.setProgress(10)

    const { products, usedSources, errors } = await fetchFromAllSources(
      fetchTargets,
      payload.keyword,
      payload.marketplace,
      20,
    )

    await recordUsage({
      organizationId: context.organizationId,
      projectId: payload.projectId,
      jobId: context.jobId,
      purpose: 'market-research.fetch',
      usage: { provider: usedSources.map((provider) => provider.id).join('+') || 'none', model: 'search', inputTokens: 0, outputTokens: 0, imageCount: 0, videoSeconds: 0, estimatedCostMicro: 0 },
    })

    if (products.length === 0) {
      throw new AppError('PROVIDER_ERROR', `市場データの取得に失敗しました: ${errors.join(' / ') || '結果が空です'}`)
    }

    // マージ結果から統計を再計算(単一ソースのgetMarketに依存しない)
    const { averagePrice, priceRange } = summarizePrices(products)
    const totalReviews = products.reduce((sum, product) => sum + (product.reviewCount ?? 0), 0)
    const sourceLabels = usedSources.map((provider) => provider.sourceLabel).join(' + ')
    const summary: MarketSummary = {
      marketplace: sourceLabels,
      keyword: payload.keyword,
      marketSize: averagePrice ? totalReviews * averagePrice : null,
      growthRate: null,
      competitionScore: estimateCompetitionScore(products),
      averagePrice,
      priceRange,
      demandTrend: [],
      notes: [
        `データ元: ${sourceLabels}(${products.length}件)`,
        ...(errors.length > 0 ? [`一部ソースの取得に失敗: ${errors.join(' / ')}`] : []),
      ],
    }
    await context.setProgress(35)

    const product = await db.product.findUnique({ where: { projectId: payload.projectId } })

    // 2つのAI分析は互いに独立のため並列実行する(所要時間ほぼ半減)
    await context.setProgress(45)
    const [research, competitorAnalysis] = await Promise.all([
      runAITask(
        marketResearchTask,
        {
          keyword: payload.keyword,
          productName: product?.name ?? payload.keyword,
          marketplace: summary.marketplace,
          sourceLabel: summary.marketplace,
          summary,
          products,
        },
        { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
      ),
      runAITask(
        competitorAnalysisTask,
        { productName: product?.name ?? payload.keyword, targetPrice: product?.price ?? null, products },
        { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
      ),
    ])
    await context.setProgress(85)

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
          averagePrice: summary.averagePrice,
          priceRange: summary.priceRange ?? undefined,
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
            sources: usedSources.map((provider) => provider.id),
            sourceErrors: errors,
          },
          completedAt: new Date(),
        },
      })
    })

    await advanceStage(payload.projectId, 'MARKET_RESEARCH')
    await context.setProgress(100)

    return {
      researchId: payload.researchId,
      competitors: products.length,
      sources: usedSources.map((provider) => provider.sourceLabel),
      synthetic: primary.synthetic,
    }
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

  const chain = await marketDataChainFor(context.organizationId)
  const reviews: MarketReview[] = []

  for (const [index, competitor] of competitors.entries()) {
    if (!competitor.asin) continue
    // 商品を取得したソースのProviderを優先し、そのIDが分かるならそこへだけ問い合わせる
    const sourceId =
      competitor.rawData && typeof competitor.rawData === 'object'
        ? ((competitor.rawData as Record<string, unknown>)._source as string | undefined)
        : undefined
    const preferred = sourceId ? chain.filter((provider) => provider.id === sourceId) : []
    const targets = preferred.length > 0 ? preferred : chain

    const outcome = await runWithFallback(targets, (provider) => provider.getReviews(competitor.asin ?? '', 30))
    if (outcome.ok) {
      reviews.push(...outcome.data)
    } else {
      // レビュー取得非対応のProvider(楽天等)があり得るため、ここでは処理を止めない。
      logger.warn('review.fetch_skipped', { asin: competitor.asin, source: sourceId, reason: outcome.error.kind })
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
