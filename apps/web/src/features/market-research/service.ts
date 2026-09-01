import 'server-only'
import type { ResearchDepth } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { marketDataProviders } from '@/providers/market-data'
import { marketDataChainFor } from '@/server/org-providers'

export async function startMarketResearch(
  projectId: string,
  input: { keyword?: string; marketplace?: string; depth?: ResearchDepth },
) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const product = await db.product.findUnique({ where: { projectId } })
  if (!product) throw AppError.notFound('商品情報が見つかりません')

  const keyword = input.keyword?.trim() || product.category || product.name
  if (!keyword) throw AppError.validation('検索キーワードを指定してください')
  const depth = input.depth ?? 'STANDARD'

  const research = await db.marketResearch.create({
    data: {
      projectId,
      status: 'PENDING',
      depth,
      keyword,
      marketplace: input.marketplace ?? 'amazon.co.jp',
      source: (await marketDataChainFor(context.organizationId))
        .filter((provider) => !provider.synthetic)
        .map((provider) => provider.id)
        .join('+') || 'mock',
    },
  })

  const job = await enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'MARKET_RESEARCH',
    handler: 'market.research',
    payload: { projectId, researchId: research.id, keyword, marketplace: research.marketplace, depth },
    createdBy: context.user.id,
  })

  return { research, job }
}

export async function getLatestResearch(projectId: string) {
  await requireProjectAccess(projectId)
  return db.marketResearch.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      competitors: { orderBy: [{ rank: 'asc' }] },
      reviews: { orderBy: { share: 'desc' } },
    },
  })
}

/** 指定IDの調査を取得する(履歴からの参照用)。他プロジェクトのIDは404。 */
export async function getResearch(projectId: string, researchId: string) {
  await requireProjectAccess(projectId)
  const research = await db.marketResearch.findUnique({
    where: { id: researchId },
    include: {
      competitors: { orderBy: [{ rank: 'asc' }] },
      reviews: { orderBy: { share: 'desc' } },
    },
  })
  if (!research || research.projectId !== projectId) throw AppError.notFound('調査が見つかりません')
  return research
}

export async function listResearch(projectId: string) {
  await requireProjectAccess(projectId)
  return db.marketResearch.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      status: true,
      depth: true,
      keyword: true,
      marketplace: true,
      source: true,
      marketSize: true,
      averagePrice: true,
      error: true,
      createdAt: true,
      completedAt: true,
      _count: { select: { competitors: true, reviews: true } },
    },
  })
}

export async function listCompetitors(projectId: string) {
  await requireProjectAccess(projectId)
  const research = await db.marketResearch.findFirst({
    where: { projectId, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    include: { competitors: { orderBy: [{ rank: 'asc' }] } },
  })
  return research?.competitors ?? []
}

export async function startReviewAnalysis(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const research = await db.marketResearch.findFirst({
    where: { projectId, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!research) throw AppError.validation('先に市場調査を実行してください')

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'MARKET_RESEARCH',
    handler: 'market.reviews',
    payload: { projectId, researchId: research.id },
    createdBy: context.user.id,
  })
}

export function providerInfo() {
  const provider = marketDataProviders().get()
  return { id: provider.id, label: provider.sourceLabel, synthetic: provider.synthetic }
}

/** 組織のBYOK設定を反映したProvider情報(画面表示用)。複数ソース併用に対応。 */
export async function providerInfoFor(projectId: string) {
  const context = await requireProjectAccess(projectId)
  const chain = await marketDataChainFor(context.organizationId)
  const real = chain.filter((provider) => !provider.synthetic)
  if (real.length === 0) return providerInfo()
  return {
    id: real.map((provider) => provider.id).join('+'),
    label: real.map((provider) => provider.sourceLabel).join(' + '),
    synthetic: false,
  }
}
