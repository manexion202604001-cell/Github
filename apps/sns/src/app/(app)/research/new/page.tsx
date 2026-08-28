import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { listBrands } from '@/features/brands/service'
import { db } from '@/server/db'
import { requireOrganization } from '@/server/authz'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { ResearchForm } from './research-form'

export const metadata: Metadata = { title: '新しい市場調査' }
export const dynamic = 'force-dynamic'

export default async function NewResearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const context = await requireOrganization()
  const brands = await listBrands()
  if (brands.length === 0) redirect('/onboarding')

  const params = await searchParams
  const requestedBrandId = typeof params.brandId === 'string' ? params.brandId : undefined
  const brand = brands.find((item) => item.id === requestedBrandId) ?? brands[0]!

  const detail = await db.brand.findFirst({
    where: { id: brand.id, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, name: true, region: true, industry: true, brandKeywords: true, snsChannels: true },
  })

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        crumbs={[{ label: 'Market Research', href: '/research' }, { label: '新しい市場調査' }]}
        title="新しい市場調査"
        description="調べたいことだけ入力してください。ブランド情報・商品情報・競合情報は自動でAIへ渡されます。"
      />

      <ResearchForm
        brands={brands.map((item) => ({ id: item.id, name: item.name }))}
        defaultBrandId={brand.id}
        defaultRegion={detail?.region ?? '日本'}
        defaultKeywords={detail?.brandKeywords ?? []}
        defaultChannel={detail?.snsChannels[0] ?? null}
        defaultTitle={detail ? `${detail.industry ?? detail.name}のSNS発信調査` : ''}
      />
    </PageShell>
  )
}
