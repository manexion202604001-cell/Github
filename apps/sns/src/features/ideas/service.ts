import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireBrandAccess, requireOrganization } from '@/server/authz'
import { recordAudit } from '@/server/audit'
import { organizationProviderId } from '@/server/org-provider'
import { runAITask } from '@/lib/ai/task'
import { ideaGenerationTask } from '@/lib/ai/prompts/ideas'
import { ideaScoreTask } from '@/lib/ai/prompts/scores'
import { hookGenerationTask } from '@/lib/ai/prompts/hooks'
import { loadBrandContext } from '@/features/brands/service'
import type { GenerateIdeasInput, IdeaEditInput } from '@/lib/validation/idea'
import { normalizeAxes, overallScore } from './domain'

export type IdeaFilter = {
  brandId?: string
  channel?: string
  category?: string
  status?: string
  favoritesOnly?: boolean
  researchId?: string
  keyword?: string
}

export async function listIdeas(filter: IdeaFilter = {}, limit = 60) {
  const context = await requireOrganization()
  return db.idea.findMany({
    where: {
      organizationId: context.organizationId,
      deletedAt: null,
      ...(filter.brandId ? { brandId: filter.brandId } : {}),
      ...(filter.channel ? { channel: filter.channel } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.researchId ? { researchId: filter.researchId } : {}),
      ...(filter.favoritesOnly ? { isFavorite: true } : {}),
      ...(filter.status ? { status: filter.status as 'DRAFT' | 'APPROVED' | 'SCRIPTED' | 'ARCHIVED' } : {}),
      ...(filter.keyword
        ? {
            OR: [
              { title: { contains: filter.keyword, mode: 'insensitive' as const } },
              { hook: { contains: filter.keyword, mode: 'insensitive' as const } },
              { summary: { contains: filter.keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    include: {
      score: true,
      brand: { select: { id: true, name: true } },
      _count: { select: { scripts: true } },
    },
    orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
}

export async function getIdea(ideaId: string) {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    include: {
      score: true,
      hooks: { orderBy: { position: 'asc' } },
      brand: { select: { id: true, name: true } },
      research: { select: { id: true, title: true } },
      scripts: { where: { deletedAt: null }, select: { id: true, title: true, status: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  return idea
}

export type GenerateIdeasResult = { created: number; synthetic: boolean }

/**
 * 調査結果から企画を生成し、続けてスコアを付ける(要件22, 25)。
 * AIの出力はすべて zod 検証済み。未検証のままDBへは入れない。
 */
export async function generateIdeas(input: GenerateIdeasInput): Promise<GenerateIdeasResult> {
  const context = await requireBrandAccess(input.brandId, 'EDITOR')
  const providerId = await organizationProviderId(context.organizationId)
  const brand = await loadBrandContext(input.brandId)

  const insights = input.researchId
    ? await db.researchInsight.findMany({
        where: { research: { id: input.researchId, organizationId: context.organizationId, deletedAt: null } },
        orderBy: { position: 'asc' },
        take: 40,
      })
    : []

  const opportunities = insights.filter((insight) => insight.category === 'opportunity').map((insight) => `${insight.title}: ${insight.content}`)

  const generated = await runAITask(
    ideaGenerationTask,
    {
      brand,
      channel: input.channel,
      count: input.count,
      goals: brand.snsGoals,
      insights: insights.map((insight, index) => ({
        index: index + 1,
        category: insight.category,
        title: insight.title,
        content: insight.content,
        insightType: insight.insightType.toLowerCase(),
      })),
      opportunities,
    },
    { organizationId: context.organizationId, userId: context.user.id, ...(providerId ? { providerId } : {}) },
  )

  const items = generated.data.ideas.slice(0, input.count)
  if (items.length === 0) {
    throw new AppError('PROVIDER_ERROR', '企画を生成できませんでした。', { hint: 'もう一度実行してください。' })
  }

  const createdIdeas = await db.$transaction(
    items.map((item) =>
      db.idea.create({
        data: {
          organizationId: context.organizationId,
          brandId: input.brandId,
          researchId: input.researchId ?? null,
          title: item.title,
          category: item.category,
          channel: input.channel,
          objective: brand.snsGoals[0] ?? null,
          hook: item.hook,
          summary: item.summary,
          whyThisIdea: item.whyThisIdea,
          target: item.target || null,
          cta: item.cta || null,
          durationSec: item.durationSec,
          difficulty: item.difficulty,
          insightIds: item.insightRefs
            .map((ref) => insights[ref - 1]?.id)
            .filter((id): id is string => typeof id === 'string'),
          createdById: context.user.id,
        },
        select: { id: true, title: true, category: true, hook: true, summary: true, difficulty: true },
      }),
    ),
  )

  await scoreIdeas(
    createdIdeas.map((idea) => idea.id),
    { organizationId: context.organizationId, userId: context.user.id, brandId: input.brandId, channel: input.channel, providerId },
  )

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'idea.generate',
    entityType: 'idea',
    summary: `企画を${createdIdeas.length}件生成`,
  })

  return { created: createdIdeas.length, synthetic: generated.synthetic }
}

/** 企画へAI推定スコアを付ける。生成直後と、再評価の両方から呼ばれる。 */
export async function scoreIdeas(
  ideaIds: string[],
  options: { organizationId: string; userId: string; brandId: string; channel: string; providerId?: string | undefined },
): Promise<void> {
  if (ideaIds.length === 0) return

  const ideas = await db.idea.findMany({
    where: { id: { in: ideaIds }, organizationId: options.organizationId, deletedAt: null },
    select: { id: true, title: true, category: true, hook: true, summary: true, difficulty: true },
  })
  if (ideas.length === 0) return

  const brand = await loadBrandContext(options.brandId)
  const scored = await runAITask(
    ideaScoreTask,
    {
      brand,
      channel: options.channel,
      ideas: ideas.map((idea, index) => ({
        index: index + 1,
        title: idea.title,
        category: idea.category,
        hook: idea.hook,
        summary: idea.summary,
        difficulty: idea.difficulty,
      })),
    },
    {
      organizationId: options.organizationId,
      userId: options.userId,
      ...(options.providerId ? { providerId: options.providerId } : {}),
    },
  )

  const updates = scored.data.scores
    .map((score) => {
      const idea = ideas[score.index - 1]
      if (!idea) return null
      const axes = normalizeAxes(score)
      const data = { ...axes, overall: overallScore(axes), reasoning: score.reasoning }
      return db.ideaScore.upsert({
        where: { ideaId: idea.id },
        create: { ideaId: idea.id, ...data },
        update: data,
      })
    })
    .filter((operation): operation is NonNullable<typeof operation> => operation !== null)

  if (updates.length > 0) await db.$transaction(updates)
}

export async function rescoreIdea(ideaId: string): Promise<void> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true, channel: true },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  await requireBrandAccess(idea.brandId, 'EDITOR')

  const providerId = await organizationProviderId(context.organizationId)
  await scoreIdeas([idea.id], {
    organizationId: context.organizationId,
    userId: context.user.id,
    brandId: idea.brandId,
    channel: idea.channel,
    providerId,
  })
}

/** 選択した企画に似た企画を追加生成する(要件27)。 */
export async function generateSimilarIdeas(ideaId: string, count = 5): Promise<GenerateIdeasResult> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true, channel: true, researchId: true, category: true, title: true },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')

  return generateIdeas({
    brandId: idea.brandId,
    channel: idea.channel,
    count: count as 10 | 20 | 30,
    ...(idea.researchId ? { researchId: idea.researchId } : {}),
  })
}

export async function updateIdea(ideaId: string, input: IdeaEditInput): Promise<void> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  await requireBrandAccess(idea.brandId, 'EDITOR')

  await db.idea.update({
    where: { id: ideaId },
    data: {
      title: input.title,
      category: input.category,
      channel: input.channel,
      hook: input.hook,
      summary: input.summary,
      whyThisIdea: input.whyThisIdea,
      target: input.target || null,
      cta: input.cta || null,
      durationSec: input.durationSec,
      difficulty: input.difficulty,
    },
  })
}

export async function toggleFavorite(ideaId: string): Promise<boolean> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true, isFavorite: true },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  await requireBrandAccess(idea.brandId, 'EDITOR')

  const updated = await db.idea.update({ where: { id: ideaId }, data: { isFavorite: !idea.isFavorite } })
  return updated.isFavorite
}

export async function deleteIdea(ideaId: string): Promise<void> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true, title: true },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  await requireBrandAccess(idea.brandId, 'EDITOR')

  await db.idea.update({ where: { id: ideaId }, data: { deletedAt: new Date() } })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'idea.delete',
    entityType: 'idea',
    entityId: ideaId,
    summary: `${idea.title} を削除(復元可能)`,
  })
}

/** Hook Generator(要件28)。 */
export async function generateHooks(ideaId: string): Promise<{ count: number; synthetic: boolean }> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true, channel: true, title: true, category: true, summary: true, target: true },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  await requireBrandAccess(idea.brandId, 'EDITOR')

  const providerId = await organizationProviderId(context.organizationId)
  const brand = await loadBrandContext(idea.brandId)
  const result = await runAITask(
    hookGenerationTask,
    {
      brand,
      channel: idea.channel,
      idea: { title: idea.title, category: idea.category, summary: idea.summary, target: idea.target },
    },
    { organizationId: context.organizationId, userId: context.user.id, ...(providerId ? { providerId } : {}) },
  )

  await db.$transaction([
    db.ideaHook.deleteMany({ where: { ideaId } }),
    db.ideaHook.createMany({
      data: result.data.hooks.map((hook, index) => ({
        ideaId,
        hookType: hook.hookType,
        text: hook.text,
        rationale: hook.rationale || null,
        position: index,
      })),
    }),
  ])

  return { count: result.data.hooks.length, synthetic: result.synthetic }
}

export async function selectHook(ideaId: string, hookId: string): Promise<void> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: ideaId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  await requireBrandAccess(idea.brandId, 'EDITOR')

  const hook = await db.ideaHook.findFirst({ where: { id: hookId, ideaId } })
  if (!hook) throw AppError.notFound('Hookが見つかりません')

  await db.$transaction([
    db.ideaHook.updateMany({ where: { ideaId }, data: { isSelected: false } }),
    db.ideaHook.update({ where: { id: hookId }, data: { isSelected: true } }),
    db.idea.update({ where: { id: ideaId }, data: { hook: hook.text } }),
  ])
}
