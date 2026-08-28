import type { Metadata } from 'next'
import { Swords } from 'lucide-react'
import { listBrands, listCompetitors } from '@/features/brands/service'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { LinkButton } from '@/components/ui/link-button'
import { CompetitorPanel } from '@/components/competitors/competitor-panel'

export const metadata: Metadata = { title: '競合' }
export const dynamic = 'force-dynamic'

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const brands = await listBrands()
  const requestedBrandId = typeof params.brandId === 'string' ? params.brandId : undefined
  const brand = brands.find((item) => item.id === requestedBrandId) ?? brands[0]

  if (!brand) {
    return (
      <PageShell>
        <PageHeader crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Competitors' }]} title="競合" />
        <EmptyState
          className="mt-8"
          icon={<Swords className="h-6 w-6" />}
          title="先にブランドを登録してください"
          description="競合はブランドごとに管理します。"
          action={<LinkButton href="/brands/new">ブランドを登録する</LinkButton>}
        />
      </PageShell>
    )
  }

  const competitors = await listCompetitors(brand.id)

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Competitors' }]}
        title="競合"
        description="登録した競合情報は、市場調査と企画生成の前提としてAIへ渡されます。"
      />

      <div className="mt-8">
        <CompetitorPanel
          brandId={brand.id}
          brandName={brand.name}
          competitors={competitors.map((competitor) => ({
            id: competitor.id,
            name: competitor.name,
            website: competitor.website,
            instagramUrl: competitor.instagramUrl,
            tiktokUrl: competitor.tiktokUrl,
            youtubeUrl: competitor.youtubeUrl,
            notes: competitor.notes,
            publicSummary: competitor.publicSummary,
            fetchError: competitor.fetchError,
          }))}
        />
      </div>
    </PageShell>
  )
}
