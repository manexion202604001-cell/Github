import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireBrandAccess, requireOrganization, requireOrganizationRole } from '@/server/authz'
import { recordAudit } from '@/server/audit'
import type { BrandContext } from '@/lib/ai/prompts/context'
import type { BrandInput, BrandProductInput, BrandRuleInput, CompetitorInput, OnboardingInput } from '@/lib/validation/brand'

export type BrandListItem = {
  id: string
  name: string
  industry: string | null
  region: string | null
  snsChannels: string[]
  researchCount: number
  ideaCount: number
  scriptCount: number
  updatedAt: Date
}

export async function listBrands(organizationId?: string): Promise<BrandListItem[]> {
  const context = await requireOrganization(organizationId)
  const brands = await db.brand.findMany({
    where: { organizationId: context.organizationId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      industry: true,
      region: true,
      snsChannels: true,
      updatedAt: true,
      _count: { select: { researchRuns: true, ideas: true, scripts: true } },
    },
  })

  return brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    industry: brand.industry,
    region: brand.region,
    snsChannels: brand.snsChannels,
    researchCount: brand._count.researchRuns,
    ideaCount: brand._count.ideas,
    scriptCount: brand._count.scripts,
    updatedAt: brand.updatedAt,
  }))
}

/**
 * 画面で「いま操作対象のブランド」を決める。
 * クエリで指定があればそれを、無ければ最初のブランドを返す。
 */
export async function resolveActiveBrand(brandId?: string): Promise<BrandListItem | null> {
  const brands = await listBrands()
  if (brands.length === 0) return null
  if (brandId) {
    const found = brands.find((brand) => brand.id === brandId)
    if (found) return found
  }
  return brands[0] ?? null
}

export async function getBrandDetail(brandId: string) {
  await requireBrandAccess(brandId)
  return db.brand.findUniqueOrThrow({
    where: { id: brandId },
    include: {
      products: { orderBy: { createdAt: 'asc' } },
      rules: true,
      competitors: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    },
  })
}

/**
 * すべてのAI処理へ渡すブランド文脈(要件11, 114)。
 * ユーザーに毎回入力させないため、ここで1度だけ組み立てる。
 */
export async function loadBrandContext(brandId: string): Promise<BrandContext> {
  await requireBrandAccess(brandId)
  const brand = await db.brand.findUniqueOrThrow({
    where: { id: brandId },
    include: {
      products: { orderBy: { createdAt: 'asc' }, take: 5 },
      rules: true,
      competitors: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, take: 8 },
    },
  })

  return {
    name: brand.name,
    industry: brand.industry,
    website: brand.website,
    region: brand.region,
    description: brand.description,
    targetCustomer: brand.targetCustomer,
    brandTone: brand.brandTone,
    snsChannels: brand.snsChannels,
    snsGoals: brand.snsGoals,
    brandKeywords: brand.brandKeywords,
    additionalContext: brand.additionalContext,
    products: brand.products.map((product) => ({
      name: product.name,
      description: product.description,
      priceRange: product.priceRange,
      strengths: product.strengths,
      weaknesses: product.weaknesses,
      differentiation: product.differentiation,
      customerProblems: product.customerProblems,
      customerNeeds: product.customerNeeds,
      purchaseReasons: product.purchaseReasons,
    })),
    competitors: brand.competitors.map((competitor) => ({
      name: competitor.name,
      website: competitor.website,
      notes: competitor.notes,
    })),
    rules: brand.rules
      ? {
          prohibitedWords: brand.rules.prohibitedWords,
          preferredWords: brand.rules.preferredWords,
          tone: brand.rules.tone,
          allowCompetitorNames: brand.rules.allowCompetitorNames,
          avoidExpressions: brand.rules.avoidExpressions,
          legalNotes: brand.rules.legalNotes,
          regulatoryNotes: brand.rules.regulatoryNotes,
          internalRules: brand.rules.internalRules,
          preferredCta: brand.rules.preferredCta,
        }
      : null,
  }
}

export async function createBrand(input: BrandInput): Promise<string> {
  const context = await requireOrganizationRole('ADMIN')
  const brand = await db.brand.create({
    data: {
      organizationId: context.organizationId,
      name: input.name,
      industry: input.industry || null,
      website: input.website ?? null,
      region: input.region || null,
      description: input.description || null,
      targetCustomer: input.targetCustomer || null,
      brandTone: input.brandTone || null,
      snsChannels: input.snsChannels,
      snsGoals: input.snsGoals,
      brandKeywords: input.brandKeywords,
      additionalContext: input.additionalContext || null,
    },
  })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'brand.create',
    entityType: 'brand',
    entityId: brand.id,
    summary: `${brand.name} を作成`,
  })
  return brand.id
}

export async function updateBrand(brandId: string, input: BrandInput): Promise<void> {
  const context = await requireBrandAccess(brandId, 'ADMIN')
  await db.brand.update({
    where: { id: brandId },
    data: {
      name: input.name,
      industry: input.industry || null,
      website: input.website ?? null,
      region: input.region || null,
      description: input.description || null,
      targetCustomer: input.targetCustomer || null,
      brandTone: input.brandTone || null,
      snsChannels: input.snsChannels,
      snsGoals: input.snsGoals,
      brandKeywords: input.brandKeywords,
      additionalContext: input.additionalContext || null,
    },
  })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'brand.update',
    entityType: 'brand',
    entityId: brandId,
    summary: `${input.name} を更新`,
  })
}

/** 重要データは物理削除しない(要件104)。 */
export async function deleteBrand(brandId: string): Promise<void> {
  const context = await requireBrandAccess(brandId, 'ADMIN')
  await db.brand.update({ where: { id: brandId }, data: { deletedAt: new Date() } })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'brand.delete',
    entityType: 'brand',
    entityId: brandId,
    summary: 'ブランドを削除(復元可能)',
  })
}

export async function upsertProduct(brandId: string, productId: string | null, input: BrandProductInput): Promise<void> {
  const context = await requireBrandAccess(brandId, 'EDITOR')
  const data = {
    name: input.name,
    description: input.description || null,
    priceRange: input.priceRange || null,
    strengths: input.strengths,
    weaknesses: input.weaknesses,
    differentiation: input.differentiation || null,
    customerProblems: input.customerProblems,
    customerNeeds: input.customerNeeds,
    purchaseReasons: input.purchaseReasons,
  }

  if (productId) {
    const existing = await db.brandProduct.findFirst({ where: { id: productId, brandId } })
    if (!existing) throw AppError.notFound('商品が見つかりません')
    await db.brandProduct.update({ where: { id: productId }, data })
  } else {
    await db.brandProduct.create({ data: { ...data, brandId } })
  }

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: productId ? 'brand_product.update' : 'brand_product.create',
    entityType: 'brand_product',
    entityId: productId,
    summary: `${input.name} を保存`,
  })
}

export async function deleteProduct(brandId: string, productId: string): Promise<void> {
  await requireBrandAccess(brandId, 'EDITOR')
  const existing = await db.brandProduct.findFirst({ where: { id: productId, brandId } })
  if (!existing) throw AppError.notFound('商品が見つかりません')
  await db.brandProduct.delete({ where: { id: productId } })
}

export async function saveBrandRules(brandId: string, input: BrandRuleInput): Promise<void> {
  const context = await requireBrandAccess(brandId, 'ADMIN')
  const data = {
    prohibitedWords: input.prohibitedWords,
    preferredWords: input.preferredWords,
    tone: input.tone || null,
    allowCompetitorNames: input.allowCompetitorNames,
    avoidExpressions: input.avoidExpressions,
    legalNotes: input.legalNotes || null,
    regulatoryNotes: input.regulatoryNotes || null,
    internalRules: input.internalRules || null,
    preferredCta: input.preferredCta || null,
    visualPreferences: input.visualPreferences || null,
  }
  await db.brandRule.upsert({ where: { brandId }, create: { ...data, brandId }, update: data })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'brand_rule.update',
    entityType: 'brand_rule',
    entityId: brandId,
    summary: 'ブランドルールを更新',
  })
}

// ── 競合(要件20)──────────────────────────────────────────────────

export async function listCompetitors(brandId: string) {
  await requireBrandAccess(brandId)
  return db.competitor.findMany({ where: { brandId, deletedAt: null }, orderBy: { createdAt: 'asc' } })
}

export async function upsertCompetitor(brandId: string, competitorId: string | null, input: CompetitorInput): Promise<void> {
  const context = await requireBrandAccess(brandId, 'EDITOR')
  const data = {
    name: input.name,
    website: input.website ?? null,
    instagramUrl: input.instagramUrl ?? null,
    tiktokUrl: input.tiktokUrl ?? null,
    youtubeUrl: input.youtubeUrl ?? null,
    notes: input.notes || null,
  }

  if (competitorId) {
    const existing = await db.competitor.findFirst({ where: { id: competitorId, brandId, deletedAt: null } })
    if (!existing) throw AppError.notFound('競合が見つかりません')
    await db.competitor.update({ where: { id: competitorId }, data })
  } else {
    await db.competitor.create({ data: { ...data, brandId } })
  }

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: competitorId ? 'competitor.update' : 'competitor.create',
    entityType: 'competitor',
    entityId: competitorId,
    summary: `${input.name} を保存`,
  })
}

export async function deleteCompetitor(brandId: string, competitorId: string): Promise<void> {
  await requireBrandAccess(brandId, 'EDITOR')
  const existing = await db.competitor.findFirst({ where: { id: competitorId, brandId, deletedAt: null } })
  if (!existing) throw AppError.notFound('競合が見つかりません')
  await db.competitor.update({ where: { id: competitorId }, data: { deletedAt: new Date() } })
}

// ── オンボーディング(要件10)────────────────────────────────────

/**
 * 4ステップの入力から、最初のブランド・商品・ターゲットをまとめて作る。
 * ここまで終われば、あとは「最初の市場調査」へ進むだけの状態になる。
 */
export async function completeOnboarding(input: OnboardingInput): Promise<string> {
  const context = await requireOrganizationRole('ADMIN')

  const targetSummary = [
    input.target.summary,
    input.target.ageRange ? `年齢: ${input.target.ageRange}` : null,
    input.target.gender ? `性別: ${input.target.gender}` : null,
    input.target.region ? `地域: ${input.target.region}` : null,
    input.target.segment ? `区分: ${input.target.segment}` : null,
    input.target.occupation ? `職業: ${input.target.occupation}` : null,
  ]
    .filter(Boolean)
    .join(' / ')

  const brandId = await db.$transaction(async (tx) => {
    const brand = await tx.brand.create({
      data: {
        organizationId: context.organizationId,
        name: input.company.name,
        industry: input.company.industry || null,
        website: input.company.website ?? null,
        region: input.company.region || null,
        description: input.company.description || null,
        targetCustomer: targetSummary || null,
        snsChannels: input.channels,
        snsGoals: input.goals,
      },
    })

    if (input.product.name) {
      await tx.brandProduct.create({
        data: {
          brandId: brand.id,
          name: input.product.name,
          description: input.product.description || null,
          priceRange: input.product.priceRange || null,
          strengths: input.product.strengths,
          differentiation: input.product.differentiation || null,
          customerProblems: input.target.problems,
          customerNeeds: input.target.needs,
          purchaseReasons: input.product.purchaseReasons,
        },
      })
    }

    await tx.user.update({ where: { id: context.user.id }, data: { onboardedAt: new Date() } })
    return brand.id
  })

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'onboarding.complete',
    entityType: 'brand',
    entityId: brandId,
    summary: `${input.company.name} の初期設定を完了`,
  })

  return brandId
}
