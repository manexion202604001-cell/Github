import type { Metadata } from 'next'
import Link from 'next/link'
import { getBrandDetail, listBrands } from '@/features/brands/service'
import { BrandRulePanel } from '@/components/brands/brand-rule-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { LinkButton } from '@/components/ui/link-button'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'ブランドルール設定' }
export const dynamic = 'force-dynamic'

export default async function BrandSettingsPage({
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
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title="先にブランドを登録してください"
        description="ブランドルールはブランドごとに設定します。"
        action={<LinkButton href="/brands/new">ブランドを登録する</LinkButton>}
      />
    )
  }

  const detail = await getBrandDetail(brand.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-ink-muted">対象ブランド:</p>
        <ul className="flex flex-wrap gap-1.5">
          {brands.map((item) => (
            <li key={item.id}>
              <Link
                href={`/settings/brand?brandId=${item.id}`}
                aria-current={item.id === brand.id ? 'page' : undefined}
                className={
                  item.id === brand.id
                    ? 'rounded-[10px] bg-brand-wash px-3 py-1.5 text-[13px] font-semibold text-brand'
                    : 'rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-ink-muted hover:bg-canvas-alt hover:text-navy'
                }
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <BrandRulePanel brandId={detail.id} rules={detail.rules} />
    </div>
  )
}
