import 'server-only'
import type { Prisma } from '@/generated/prisma'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { requireBrandAccess, requireOrganization } from '@/server/authz'
import { recordAudit } from '@/server/audit'
import { fingerprint } from '@/server/crypto'
import { organizationProviderId } from '@/server/org-provider'
import { runAITask } from '@/lib/ai/task'
import { searchMany } from '@/lib/search'
import { researchPlanTask, researchReportTask, type ResearchPlan } from '@/lib/ai/prompts/research'
import { loadBrandContext } from '@/features/brands/service'
import { depthSettings } from '@/lib/config/taxonomy'
import type { ResearchInput } from '@/lib/validation/research'
import { normalizeInsightType, resolveSourceRefs } from './domain'

/** 直近の類似調査を見つける期間(要件69)。 */
const CACHE_WINDOW_DAYS = 7

export async function listResearchRuns(options: { brandId?: string; limit?: number } = {}) {
  const context = await requireOrganization()
  return db.researchRun.findMany({
    where: {
      organizationId: context.organizationId,
      deletedAt: null,
      ...(options.brandId ? { brandId: options.brandId } : {}),
    },
    include: {
      brand: { select: { id: true, name: true } },
      _count: { select: { sources: true, insights: true, ideas: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 50,
  })
}

export async function getResearchRun(researchId: string) {
  const context = await requireOrganization()
  const run = await db.researchRun.findFirst({
    where: { id: researchId, organizationId: context.organizationId, deletedAt: null },
    include: {
      brand: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      sources: { orderBy: { position: 'asc' } },
      insights: { orderBy: { position: 'asc' } },
      _count: { select: { ideas: true } },
    },
  })
  if (!run) throw AppError.notFound('調査が見つかりません')
  return run
}

/** 同条件の調査が直近にあるかを返す(要件69)。 */
export async function findRecentSimilar(input: ResearchInput) {
  const context = await requireBrandAccess(input.brandId)
  const since = new Date(Date.now() - CACHE_WINDOW_DAYS * 24 * 3600_000)
  return db.researchRun.findFirst({
    where: {
      organizationId: context.organizationId,
      brandId: input.brandId,
      deletedAt: null,
      status: 'COMPLETED',
      createdAt: { gte: since },
      fingerprint: researchFingerprint(input),
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true },
  })
}

function researchFingerprint(input: ResearchInput): string {
  return fingerprint([input.brandId, input.channel, input.region, input.objective, input.keywords])
}

/**
 * 調査を作成する。実行はまだ行わず、DRAFT で保存する。
 * 生成が長時間になるため、作成と実行を分けて途中経過を保存できるようにしている(要件98)。
 */
export async function createResearchRun(input: ResearchInput): Promise<string> {
  const context = await requireBrandAccess(input.brandId, 'EDITOR')

  const run = await db.researchRun.create({
    data: {
      organizationId: context.organizationId,
      brandId: input.brandId,
      title: input.title,
      channel: input.channel,
      region: input.region,
      objective: input.objective,
      depth: input.depth as 'QUICK' | 'STANDARD' | 'DEEP',
      keywords: input.keywords,
      competitorUrls: input.competitorUrls,
      freeText: input.freeText || null,
      status: 'DRAFT',
      fingerprint: researchFingerprint(input),
      inputJson: input as unknown as Prisma.InputJsonValue,
      createdById: context.user.id,
    },
  })

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'research.create',
    entityType: 'research_run',
    entityId: run.id,
    summary: `${input.title} を作成`,
  })

  return run.id
}

export type ResearchRunResult = {
  sourceCount: number
  insightCount: number
  searchFailures: string[]
  synthetic: boolean
}

/**
 * 調査を実行する(要件15〜19)。
 *   1. AIが検索計画を作る
 *   2. 検索Providerで情報を集め、出典として保存する
 *   3. 出典だけを根拠にレポートを構成する
 * 各段階で status / stage を更新するため、途中でページを離れても状態が復元できる。
 */
export async function runResearch(researchId: string): Promise<ResearchRunResult> {
  const context = await requireOrganization()
  const run = await db.researchRun.findFirst({
    where: { id: researchId, organizationId: context.organizationId, deletedAt: null },
  })
  if (!run) throw AppError.notFound('調査が見つかりません')
  await requireBrandAccess(run.brandId, 'EDITOR')

  if (run.status === 'PLANNING' || run.status === 'SEARCHING' || run.status === 'ANALYZING') {
    throw AppError.conflict('この調査はすでに実行中です', 'しばらく待ってから画面を再読み込みしてください。')
  }

  const providerId = await organizationProviderId(context.organizationId)
  const brand = await loadBrandContext(run.brandId)
  const depth = depthSettings(run.depth)

  try {
    // ── 1. 検索計画 ────────────────────────────────────────────────
    await db.researchRun.update({
      where: { id: run.id },
      data: { status: 'PLANNING', stage: 'planning', errorMessage: null },
    })

    const planResult = await runAITask(
      researchPlanTask,
      {
        brand,
        channel: run.channel,
        region: run.region,
        objective: run.objective,
        depth: run.depth,
        keywords: run.keywords,
        freeText: run.freeText,
      },
      { organizationId: context.organizationId, userId: context.user.id, ...(providerId ? { providerId } : {}) },
    )
    const plan = planResult.data

    await db.researchRun.update({
      where: { id: run.id },
      data: { planJson: plan as unknown as Prisma.InputJsonValue, status: 'SEARCHING', stage: 'searching' },
    })

    // ── 2. Web検索 ────────────────────────────────────────────────
    const queries = dedupe([
      ...plan.searchQueries,
      ...plan.competitorQueries,
      ...plan.customerQueries,
      ...plan.trendQueries,
    ]).slice(0, depth.queries)

    const { results, failures } = await searchMany(
      queries.map((query) => ({ query, region: run.region, maxResults: 5 })),
    )

    if (results.length === 0) {
      const message =
        failures.length > 0
          ? '検索サービスへ接続できませんでした。'
          : '検索結果を取得できませんでした。'
      throw new AppError('PROVIDER_ERROR', message, {
        hint: '数分後に再実行するか、キーワードを変えてお試しください。',
      })
    }

    await db.researchSource.deleteMany({ where: { researchId: run.id } })
    await db.researchSource.createMany({
      data: results.slice(0, 40).map((result, index) => ({
        researchId: run.id,
        title: result.title.slice(0, 300),
        url: result.url.slice(0, 1000),
        domain: result.domain,
        snippet: result.snippet.slice(0, 1000),
        publishedAt: result.publishedAt,
        searchQuery: result.searchQuery,
        position: index + 1,
      })),
    })

    const sources = await db.researchSource.findMany({
      where: { researchId: run.id },
      orderBy: { position: 'asc' },
    })

    // ── 3. レポート構成 ───────────────────────────────────────────
    await db.researchRun.update({ where: { id: run.id }, data: { status: 'ANALYZING', stage: 'analyzing' } })

    const reportResult = await runAITask(
      researchReportTask,
      {
        brand,
        channel: run.channel,
        region: run.region,
        objective: run.objective,
        depth: run.depth,
        plan: plan as ResearchPlan,
        freeText: run.freeText,
        sources: sources.map((source) => ({
          index: source.position,
          title: source.title,
          url: source.url,
          domain: source.domain,
          snippet: source.snippet ?? '',
          query: source.searchQuery,
        })),
        searchFailures: failures.map((failure) => failure.query),
      },
      { organizationId: context.organizationId, userId: context.user.id, ...(providerId ? { providerId } : {}) },
    )

    const report = reportResult.data
    const sourceIds = sources.map((source) => source.id)

    const insightRows: Prisma.ResearchInsightCreateManyInput[] = []
    let position = 0

    const push = (
      category: string,
      item: { title: string; content: string; insightType: 'fact' | 'insight' | 'hypothesis'; confidence: number; sourceRefs: number[] },
      meta?: Prisma.InputJsonValue,
    ) => {
      const resolved = resolveSourceRefs(item.sourceRefs, sourceIds)
      insightRows.push({
        researchId: run.id,
        category,
        title: item.title,
        content: item.content,
        insightType: normalizeInsightType(item.insightType, resolved),
        confidence: item.confidence,
        sourceIds: resolved,
        position: position++,
        ...(meta === undefined ? {} : { metaJson: meta }),
      })
    }

    report.executiveSummary.forEach((item) => push('overview', item))
    report.market.forEach((item) => push('market', item))
    report.customer.forEach((item) => push('customer', item))
    report.sns.forEach((item) => push('sns', item))
    report.contentGaps.forEach((item) => push('gap', item))

    report.competitors.forEach((competitor) => {
      push(
        'competitor',
        {
          title: competitor.name,
          content: competitor.positioning,
          insightType: 'insight',
          confidence: 60,
          sourceRefs: competitor.sourceRefs,
        },
        {
          url: competitor.url,
          themes: competitor.themes,
          strengths: competitor.strengths,
          weaknesses: competitor.weaknesses,
          differentiationRoom: competitor.differentiationRoom,
        },
      )
    })

    report.opportunities.forEach((opportunity) => {
      push(
        'opportunity',
        {
          title: opportunity.title,
          content: opportunity.content,
          insightType: 'insight',
          confidence: 65,
          sourceRefs: opportunity.sourceRefs,
        },
        { whyNow: opportunity.whyNow },
      )
    })

    await db.$transaction([
      db.researchInsight.deleteMany({ where: { researchId: run.id } }),
      db.researchInsight.createMany({ data: insightRows }),
      db.researchRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          stage: null,
          summary: report.summary,
          completedAt: new Date(),
          errorMessage: null,
        },
      }),
    ])

    await recordAudit({
      organizationId: context.organizationId,
      userId: context.user.id,
      action: 'research.run',
      entityType: 'research_run',
      entityId: run.id,
      summary: `${run.title} を実行(出典${sources.length}件 / インサイト${insightRows.length}件)`,
    })

    return {
      sourceCount: sources.length,
      insightCount: insightRows.length,
      searchFailures: failures.map((failure) => failure.message),
      synthetic: reportResult.synthetic,
    }
  } catch (error) {
    const appError = error instanceof AppError ? error : null
    logger.error('research.run_failed', {
      researchId: run.id,
      error: error instanceof Error ? error.message : String(error),
    })
    await db.researchRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        stage: null,
        errorMessage: appError?.message ?? '調査の実行に失敗しました',
      },
    })
    throw error
  }
}

export async function deleteResearchRun(researchId: string): Promise<void> {
  const context = await requireOrganization()
  const run = await db.researchRun.findFirst({
    where: { id: researchId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true, title: true },
  })
  if (!run) throw AppError.notFound('調査が見つかりません')
  await requireBrandAccess(run.brandId, 'EDITOR')

  await db.researchRun.update({ where: { id: run.id }, data: { deletedAt: new Date() } })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'research.delete',
    entityType: 'research_run',
    entityId: run.id,
    summary: `${run.title} を削除(復元可能)`,
  })
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const key = value.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(value.trim())
  }
  return result
}
