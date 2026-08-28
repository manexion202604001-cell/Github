import 'server-only'
import { db } from '@/server/db'
import { requireOrganization } from '@/server/authz'

export type LibraryType = 'research' | 'idea' | 'script' | 'prompt'

export type LibraryFilter = {
  keyword?: string
  brandId?: string
  channel?: string
  type?: LibraryType | 'all'
  status?: string
  from?: Date
  to?: Date
}

export type LibraryRow = {
  id: string
  type: LibraryType
  title: string
  excerpt: string
  brandName: string
  channel: string | null
  status: string
  href: string
  createdAt: Date
}

const TAKE_PER_TYPE = 25

/**
 * Research / Idea / Script / Prompt を横断検索する(要件44)。
 * 種別ごとにクエリを分け、共通の行フォーマットへ揃えて返す。
 */
export async function searchLibrary(filter: LibraryFilter): Promise<LibraryRow[]> {
  const context = await requireOrganization()
  const keyword = filter.keyword?.trim()
  const type = filter.type ?? 'all'

  const dateFilter =
    filter.from || filter.to
      ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
      : {}

  const base = {
    organizationId: context.organizationId,
    deletedAt: null,
    ...(filter.brandId ? { brandId: filter.brandId } : {}),
    ...(filter.channel ? { channel: filter.channel } : {}),
    ...dateFilter,
  }

  const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const })
  const rows: LibraryRow[] = []

  if (type === 'all' || type === 'research') {
    const runs = await db.researchRun.findMany({
      where: {
        ...base,
        ...(keyword ? { OR: [{ title: contains(keyword) }, { summary: contains(keyword) }] } : {}),
        ...(filter.status ? { status: filter.status as 'COMPLETED' } : {}),
      },
      include: { brand: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: TAKE_PER_TYPE,
    })
    rows.push(
      ...runs.map((run) => ({
        id: run.id,
        type: 'research' as const,
        title: run.title,
        excerpt: run.summary ?? '調査の実行前です。',
        brandName: run.brand.name,
        channel: run.channel,
        status: run.status,
        href: `/research/${run.id}`,
        createdAt: run.createdAt,
      })),
    )
  }

  if (type === 'all' || type === 'idea') {
    const ideas = await db.idea.findMany({
      where: {
        ...base,
        ...(keyword ? { OR: [{ title: contains(keyword) }, { hook: contains(keyword) }, { summary: contains(keyword) }] } : {}),
        ...(filter.status ? { status: filter.status as 'DRAFT' } : {}),
      },
      include: { brand: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: TAKE_PER_TYPE,
    })
    rows.push(
      ...ideas.map((idea) => ({
        id: idea.id,
        type: 'idea' as const,
        title: idea.title,
        excerpt: idea.hook,
        brandName: idea.brand.name,
        channel: idea.channel,
        status: idea.status,
        href: `/ideas/${idea.id}`,
        createdAt: idea.createdAt,
      })),
    )
  }

  if (type === 'all' || type === 'script') {
    const scripts = await db.script.findMany({
      where: {
        ...base,
        ...(keyword ? { OR: [{ title: contains(keyword) }, { hook: contains(keyword) }] } : {}),
        ...(filter.status ? { status: filter.status as 'DRAFT' } : {}),
      },
      include: { brand: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: TAKE_PER_TYPE,
    })
    rows.push(
      ...scripts.map((script) => ({
        id: script.id,
        type: 'script' as const,
        title: script.title,
        excerpt: script.hook,
        brandName: script.brand.name,
        channel: script.channel,
        status: script.status,
        href: `/scripts/${script.id}`,
        createdAt: script.createdAt,
      })),
    )
  }

  if (type === 'all' || type === 'prompt') {
    const prompts = await db.videoPrompt.findMany({
      where: {
        scene: {
          script: {
            organizationId: context.organizationId,
            deletedAt: null,
            ...(filter.brandId ? { brandId: filter.brandId } : {}),
            ...(filter.channel ? { channel: filter.channel } : {}),
          },
        },
        ...(keyword ? { prompt: contains(keyword) } : {}),
        ...dateFilter,
      },
      include: {
        scene: { select: { position: true, script: { select: { id: true, title: true, channel: true, brand: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: TAKE_PER_TYPE,
    })
    rows.push(
      ...prompts.map((prompt) => ({
        id: prompt.id,
        type: 'prompt' as const,
        title: `${prompt.scene.script.title} — Scene ${prompt.scene.position + 1}`,
        excerpt: prompt.prompt.slice(0, 160),
        brandName: prompt.scene.script.brand.name,
        channel: prompt.scene.script.channel,
        status: prompt.preset.toUpperCase(),
        href: `/scripts/${prompt.scene.script.id}#prompts`,
        createdAt: prompt.createdAt,
      })),
    )
  }

  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
