import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, FlaskConical, Library as LibraryIcon, Lightbulb, Film } from 'lucide-react'
import { searchLibrary, type LibraryType } from '@/features/library/service'
import { listBrands } from '@/features/brands/service'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LibraryFilters } from '@/components/library/filters'
import { channelLabel } from '@/lib/config/channels'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'ライブラリ' }
export const dynamic = 'force-dynamic'

const TYPE_META = {
  research: { label: '調査', icon: FlaskConical, tone: 'brand' as const },
  idea: { label: '企画', icon: Lightbulb, tone: 'insight' as const },
  script: { label: '台本', icon: FileText, tone: 'cyan' as const },
  prompt: { label: 'プロンプト', icon: Film, tone: 'neutral' as const },
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const single = (key: string): string | undefined => (typeof params[key] === 'string' ? (params[key] as string) : undefined)

  const brands = await listBrands()
  const type = (single('type') ?? 'all') as LibraryType | 'all'

  const rows = await searchLibrary({
    ...(single('q') ? { keyword: single('q')! } : {}),
    ...(single('brandId') ? { brandId: single('brandId')! } : {}),
    ...(single('channel') ? { channel: single('channel')! } : {}),
    type,
    ...(single('from') ? { from: new Date(single('from')!) } : {}),
    ...(single('to') ? { to: new Date(single('to')!) } : {}),
  })

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Library' }]}
        title="ライブラリ"
        description="調査・企画・台本・生成AIプロンプトを横断して検索できます。過去の資産を社内に蓄積します。"
      />

      <div className="mt-6">
        <LibraryFilters brands={brands.map((brand) => ({ id: brand.id, name: brand.name }))} />
      </div>

      <p className="mt-6 text-[13px] font-semibold text-navy">
        <span className="tabular">{rows.length}</span> 件
      </p>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<LibraryIcon className="h-6 w-6" />}
          title="該当するデータがありません"
          description="条件を変えて検索するか、市場調査・企画・台本を作成してみてください。"
        />
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => {
            const meta = TYPE_META[row.type]
            const Icon = meta.icon
            return (
              <Card key={`${row.type}-${row.id}`} tone="flat">
                <CardBody className="py-3">
                  <Link href={row.href} className="group flex items-start gap-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas-alt text-ink-muted">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <p className="min-w-0 truncate text-[14px] font-bold text-navy group-hover:text-brand">{row.title}</p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">{row.excerpt}</p>
                      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-ink-subtle">
                        <span>{row.brandName}</span>
                        {row.channel ? <span>{channelLabel(row.channel)}</span> : null}
                        <span>{row.status}</span>
                        <span>{formatDate(row.createdAt)}</span>
                      </p>
                    </div>
                  </Link>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
