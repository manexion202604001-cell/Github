import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Lightbulb } from 'lucide-react'
import { listIdeas } from '@/features/ideas/service'
import { listBrands } from '@/features/brands/service'
import { listResearchRuns } from '@/features/research/service'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { LinkButton } from '@/components/ui/link-button'
import { IdeaCard } from '@/components/ideas/idea-card'
import { IdeaGeneratePanel } from '@/components/ideas/generate-panel'
import { IdeaFilters } from '@/components/ideas/filters'
import { DEFAULT_CHANNEL } from '@/lib/config/channels'

export const metadata: Metadata = { title: '企画' }
export const dynamic = 'force-dynamic'

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const single = (key: string): string | undefined => (typeof params[key] === 'string' ? (params[key] as string) : undefined)

  const brands = await listBrands()
  const brandId = brands.find((brand) => brand.id === single('brandId'))?.id ?? brands[0]?.id

  if (!brandId) {
    return (
      <PageShell>
        <PageHeader crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Ideas' }]} title="企画" />
        <EmptyState
          className="mt-8"
          icon={<Lightbulb className="h-6 w-6" />}
          title="先にブランドを登録してください"
          description="企画はブランド情報と市場調査を根拠に生成します。"
          action={<LinkButton href="/brands/new">ブランドを登録する</LinkButton>}
        />
      </PageShell>
    )
  }

  const [ideas, researches] = await Promise.all([
    listIdeas({
      brandId,
      ...(single('channel') ? { channel: single('channel')! } : {}),
      ...(single('category') ? { category: single('category')! } : {}),
      ...(single('researchId') ? { researchId: single('researchId')! } : {}),
      ...(single('favorite') === '1' ? { favoritesOnly: true } : {}),
    }),
    listResearchRuns({ brandId, limit: 20 }),
  ])

  const brand = brands.find((item) => item.id === brandId)!
  const exportParams = new URLSearchParams({ brandId })

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Ideas' }]}
        title="企画"
        description="市場調査のインサイトを根拠に、SNS企画をまとめて生成し、AI推定スコアで比較できます。"
        action={
          ideas.length > 0 ? (
            <a
              href={`/api/ideas/export?${exportParams.toString()}`}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-canvas-alt"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV
            </a>
          ) : null
        }
      />

      <div className="mt-6">
        <IdeaGeneratePanel
          brandId={brandId}
          defaultChannel={brand.snsChannels[0] ?? DEFAULT_CHANNEL}
          researches={researches.filter((run) => run.status === 'COMPLETED').map((run) => ({ id: run.id, title: run.title }))}
          defaultResearchId={single('researchId') ?? null}
        />
      </div>

      {ideas.length > 0 ? (
        <div className="mt-8">
          <IdeaFilters total={ideas.length} />
        </div>
      ) : null}

      {ideas.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Lightbulb className="h-6 w-6" />}
          title="まだ企画がありません"
          description="上のパネルから企画を生成できます。市場調査を先に実行しておくと、根拠のある企画になります。"
          action={
            researches.length === 0 ? (
              <LinkButton href={`/research/new?brandId=${brandId}`} variant="gradient">
                先に市場調査をする
              </LinkButton>
            ) : null
          }
        />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={{
                id: idea.id,
                title: idea.title,
                category: idea.category,
                channel: idea.channel,
                hook: idea.hook,
                whyThisIdea: idea.whyThisIdea,
                cta: idea.cta,
                durationSec: idea.durationSec,
                difficulty: idea.difficulty,
                isFavorite: idea.isFavorite,
                score: idea.score?.overall ?? null,
                scriptCount: idea._count.scripts,
              }}
            />
          ))}
        </div>
      )}

      {ideas.length > 0 ? (
        <p className="mt-8 text-[12px] text-ink-subtle">
          スコアはAIによる推定評価です。成果を保証するものではありません。最終的な判断は必ず人が行ってください。
          <Link href="/library" className="ml-1 font-semibold text-brand hover:underline">
            過去の企画を検索する
          </Link>
        </p>
      ) : null}
    </PageShell>
  )
}
