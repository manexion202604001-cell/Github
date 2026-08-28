import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { listBrands } from '@/features/brands/service'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LinkButton } from '@/components/ui/link-button'
import { channelLabel } from '@/lib/config/channels'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'ブランド' }
export const dynamic = 'force-dynamic'

export default async function BrandsPage() {
  const brands = await listBrands()

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Brands' }]}
        title="ブランド"
        description="登録した情報はブランドカルテとして保存され、すべてのAI処理へ自動的に渡されます。"
        action={
          <LinkButton href="/brands/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            ブランドを追加
          </LinkButton>
        }
      />

      {brands.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Building2 className="h-6 w-6" />}
          title="まだブランドがありません"
          description="ブランドを登録すると、市場調査・企画・台本のすべてがそのブランドの文脈で動きます。"
          action={<LinkButton href="/brands/new" variant="gradient">ブランドを登録する</LinkButton>}
        />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id} className="transition-[border-color,box-shadow] hover:border-brand/35 hover:shadow-[0_16px_44px_rgba(15,39,80,0.1)]">
              <CardBody>
                <Link href={`/brands/${brand.id}`} className="block text-[15px] font-bold text-navy hover:text-brand">
                  {brand.name}
                </Link>
                <p className="mt-1 text-[12px] text-ink-muted">
                  {[brand.industry, brand.region].filter(Boolean).join(' ・ ') || '業種・地域は未設定'}
                </p>

                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {brand.snsChannels.map((channel) => (
                    <li key={channel}>
                      <Badge tone="brand">{channelLabel(channel)}</Badge>
                    </li>
                  ))}
                </ul>

                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                  <Stat label="調査" value={brand.researchCount} />
                  <Stat label="企画" value={brand.ideaCount} />
                  <Stat label="台本" value={brand.scriptCount} />
                </dl>
                <p className="mt-3 text-[11px] text-ink-subtle">最終更新 {formatDate(brand.updatedAt)}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-subtle">{label}</dt>
      <dd className="tabular mt-0.5 text-[16px] text-navy">{value}</dd>
    </div>
  )
}
