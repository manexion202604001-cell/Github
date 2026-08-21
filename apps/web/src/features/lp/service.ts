import 'server-only'
import type { LandingSectionKind } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { recordAudit } from '@/server/audit'
import { renderLandingPageHtml, type RenderPage } from './domain'

export async function startLPGeneration(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'lp.generate',
    payload: { projectId },
    createdBy: context.user.id,
  })
}

export async function getCurrentLandingPage(projectId: string) {
  await requireProjectAccess(projectId)
  return db.landingPage.findFirst({
    where: { projectId, isCurrent: true },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
}

export async function listLandingPages(projectId: string) {
  await requireProjectAccess(projectId)
  return db.landingPage.findMany({
    where: { projectId },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, title: true, headline: true, isCurrent: true, createdAt: true },
  })
}

export async function updateSection(
  projectId: string,
  sectionId: string,
  input: {
    title?: string | null
    subtitle?: string | null
    body?: string | null
    items?: { label: string; value: string | null }[]
    imageUrl?: string | null
    ctaLabel?: string | null
    ctaHref?: string | null
    visible?: boolean
  },
) {
  await requireProjectAccess(projectId, 'EDITOR')
  const section = await db.landingPageSection.findUnique({
    where: { id: sectionId },
    include: { landingPage: { select: { projectId: true } } },
  })
  if (!section || section.landingPage.projectId !== projectId) throw AppError.notFound('セクションが見つかりません')

  return db.landingPageSection.update({
    where: { id: sectionId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.items !== undefined ? { items: input.items } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
      ...(input.ctaHref !== undefined ? { ctaHref: input.ctaHref } : {}),
      ...(input.visible !== undefined ? { visible: input.visible } : {}),
    },
  })
}

export async function reorderSections(projectId: string, orderedIds: string[]): Promise<void> {
  await requireProjectAccess(projectId, 'EDITOR')
  const page = await db.landingPage.findFirst({ where: { projectId, isCurrent: true }, select: { id: true } })
  if (!page) throw AppError.notFound('LPが見つかりません')

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.landingPageSection.updateMany({ where: { id, landingPageId: page.id }, data: { order: index } }),
    ),
  )
}

export async function addSection(projectId: string, kind: LandingSectionKind) {
  await requireProjectAccess(projectId, 'EDITOR')
  const page = await db.landingPage.findFirst({
    where: { projectId, isCurrent: true },
    include: { sections: { orderBy: { order: 'desc' }, take: 1 } },
  })
  if (!page) throw AppError.notFound('LPが見つかりません')

  return db.landingPageSection.create({
    data: {
      landingPageId: page.id,
      kind,
      order: (page.sections[0]?.order ?? -1) + 1,
      title: '新しいセクション',
    },
  })
}

export async function deleteSection(projectId: string, sectionId: string): Promise<void> {
  await requireProjectAccess(projectId, 'EDITOR')
  const section = await db.landingPageSection.findUnique({
    where: { id: sectionId },
    include: { landingPage: { select: { projectId: true } } },
  })
  if (!section || section.landingPage.projectId !== projectId) throw AppError.notFound('セクションが見つかりません')
  await db.landingPageSection.delete({ where: { id: sectionId } })
}

export async function publishLandingPage(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const page = await db.landingPage.findFirst({ where: { projectId, isCurrent: true } })
  if (!page) throw AppError.notFound('LPが見つかりません')

  const slug = page.publicSlug ?? `${projectId.slice(0, 8)}-${page.version}-${Math.random().toString(36).slice(2, 8)}`
  const updated = await db.landingPage.update({
    where: { id: page.id },
    data: { status: 'PUBLISHED', publicSlug: slug },
  })

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'lp.publish',
    entityType: 'LandingPage',
    entityId: page.id,
    summary: `LP v${page.version} を公開`,
  })

  return updated
}

export function toRenderPage(page: {
  title: string
  headline: string | null
  subheadline: string | null
  sections: {
    kind: string
    title: string | null
    subtitle: string | null
    body: string | null
    items: unknown
    imageUrl: string | null
    ctaLabel: string | null
    ctaHref: string | null
    visible: boolean
  }[]
}): RenderPage {
  return {
    title: page.title,
    headline: page.headline,
    subheadline: page.subheadline,
    sections: page.sections.map((section) => ({
      kind: section.kind,
      title: section.title,
      subtitle: section.subtitle,
      body: section.body,
      items: parseItems(section.items),
      imageUrl: section.imageUrl,
      ctaLabel: section.ctaLabel,
      ctaHref: section.ctaHref,
      visible: section.visible,
    })),
  }
}

export function parseItems(value: unknown): { label: string; value: string | null }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if (typeof record.label !== 'string') return []
    return [{ label: record.label, value: typeof record.value === 'string' ? record.value : null }]
  })
}

export async function exportHtml(projectId: string): Promise<string> {
  const page = await getCurrentLandingPage(projectId)
  if (!page) throw AppError.notFound('LPが見つかりません')
  return renderLandingPageHtml(toRenderPage(page))
}

/** 公開URL用。認証なしで参照できるのは PUBLISHED のLPのみ。 */
export async function getPublicLandingPage(slug: string) {
  return db.landingPage.findFirst({
    where: { publicSlug: slug, status: 'PUBLISHED' },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
}
