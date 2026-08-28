import type { Metadata } from 'next'
import { Calendar as CalendarIcon } from 'lucide-react'
import { listCalendarItems } from '@/features/calendar/service'
import { listBrands } from '@/features/brands/service'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { LinkButton } from '@/components/ui/link-button'
import { CalendarView } from '@/components/calendar/calendar-view'

export const metadata: Metadata = { title: 'カレンダー' }
export const dynamic = 'force-dynamic'

export default async function CalendarPage({
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
        <PageHeader crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} title="コンテンツカレンダー" />
        <EmptyState
          className="mt-8"
          icon={<CalendarIcon className="h-6 w-6" />}
          title="先にブランドを登録してください"
          description="投稿予定はブランドごとに管理します。"
          action={<LinkButton href="/brands/new">ブランドを登録する</LinkButton>}
        />
      </PageShell>
    )
  }

  const items = await listCalendarItems({ brandId: brand.id })

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]}
        title="コンテンツカレンダー"
        description="投稿予定を管理します。SNSへの自動投稿は行いません。"
      />

      <div className="mt-8">
        <CalendarView
          brandId={brand.id}
          items={items.map((item) => ({
            id: item.id,
            title: item.title,
            channel: item.channel,
            status: item.status,
            scheduledAt: item.scheduledAt.toISOString(),
            assigneeName: item.assignee?.name ?? item.assignee?.email ?? null,
            ideaId: item.ideaId,
            scriptId: item.scriptId,
            notes: item.notes,
          }))}
        />
      </div>
    </PageShell>
  )
}
