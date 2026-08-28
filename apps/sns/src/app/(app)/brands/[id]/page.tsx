import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBrandDetail } from '@/features/brands/service'
import { AppError } from '@/lib/errors'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { BrandForm } from '@/components/brands/brand-form'
import { ProductPanel } from '@/components/brands/product-panel'
import { BrandRulePanel } from '@/components/brands/brand-rule-panel'
import { DeleteBrandButton } from '@/components/brands/delete-button'

export const metadata: Metadata = { title: 'ブランド設定' }
export const dynamic = 'force-dynamic'

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await getBrandDetail(id).catch((error) => {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  })

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        crumbs={[{ label: 'Brands', href: '/brands' }, { label: brand.name }]}
        title={brand.name}
        description="ブランドカルテ。ここに蓄積した情報が、すべてのAI処理の前提になります。"
        action={<DeleteBrandButton brandId={brand.id} name={brand.name} />}
      />

      <div className="mt-8 space-y-8">
        <BrandForm
          mode="edit"
          brand={{
            id: brand.id,
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
          }}
        />

        <ProductPanel brandId={brand.id} products={brand.products} />

        <BrandRulePanel brandId={brand.id} rules={brand.rules} />
      </div>
    </PageShell>
  )
}
