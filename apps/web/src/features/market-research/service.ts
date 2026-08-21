import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { marketDataProviders } from '@/providers/market-data'

export async function startMarketResearch(projectId: string, input: { keyword?: string; marketplace?: string }) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const product = await db.product.findUnique({ where: { projectId } })
  if (!product) throw AppError.notFound('商品情報が見つかりません')

  const keyword = input.keyword?.trim() || product.category || product.name
  if (!keyword) throw AppError.validation('検索キーワードを指定してください')

  const research = await db.marketResearch.create({
    data: {
      projectId,
      status: 'PENDING',
      keyword,
      marketplace: input.marketplace ?? 'amazon.co.jp',
      source: marketDataProviders().get().id,
    },
  })

  const job = await enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'MARKET_RESEARCH',
    handler: 'market.research',
    payload: { projectId, researchId: research.id, keyword, marketplace: research.marketplace },
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

export async function listResearch(projectId: string) {
  await requireProjectAccess(projectId)
  return db.marketResearch.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      keyword: true,
      marketplace: true,
      source: true,
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
