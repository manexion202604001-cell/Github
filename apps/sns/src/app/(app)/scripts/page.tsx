import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { listScripts } from '@/features/scripts/service'
import { listBrands } from '@/features/brands/service'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LinkButton } from '@/components/ui/link-button'
import { ScoreGauge } from '@/components/ui/score-gauge'
import { channelLabel } from '@/lib/config/channels'
import { SCRIPT_STYLES, labelOf } from '@/lib/config/taxonomy'
import { formatDate, formatSeconds } from '@/lib/format'

export const metadata: Metadata = { title: '台本' }
export const dynamic = 'force-dynamic'

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const brands = await listBrands()
  const requestedBrandId = typeof params.brandId === 'string' ? params.brandId : undefined
  const brandId = brands.find((brand) => brand.id === requestedBrandId)?.id ?? brands[0]?.id

  const scripts = await listScripts(brandId ? { brandId } : {})

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Scripts' }]}
        title="台本"
        description="企画から作成したシーン単位の台本です。撮影指示や動画生成AI用プロンプトもここから作れます。"
      />

      {scripts.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<FileText className="h-6 w-6" />}
          title="まだ台本がありません"
          description="企画を選んで「台本を作る」を押すと、シーン単位の台本が作成されます。"
          action={
            <LinkButton href={brandId ? `/ideas?brandId=${brandId}` : '/ideas'} variant="gradient">
              企画から台本を作る
            </LinkButton>
          }
        />
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {scripts.map((script) => (
            <Card key={script.id} className="transition-[border-color,box-shadow] hover:border-brand/35 hover:shadow-[0_16px_44px_rgba(15,39,80,0.1)]">
              <CardBody>
                <div className="flex items-start gap-4">
                  {script.idea?.score ? <ScoreGauge value={script.idea.score.overall} size="sm" /> : null}
                  <div className="min-w-0 flex-1">
                    <Link href={`/scripts/${script.id}`} className="block truncate text-[15px] font-bold text-navy hover:text-brand">
                      {script.title}
                    </Link>
                    <p className="mt-1 truncate text-[13px] text-ink-muted">「{script.hook}」</p>
                  </div>
                  <Badge tone={script.status === 'READY' ? 'positive' : script.status === 'ARCHIVED' ? 'neutral' : 'brand'}>
                    {script.status}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[12px] text-ink-muted">
                  <span>{script.brand.name}</span>
                  <span>{channelLabel(script.channel)}</span>
                  <span>{formatSeconds(script.durationSec)}</span>
                  <span>{labelOf(SCRIPT_STYLES, script.style)}</span>
                  <span className="tabular">{script._count.scenes} シーン</span>
                  <span className="ml-auto">{formatDate(script.updatedAt)}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}
