import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { requireOrganization } from '@/server/authz'
import { listBrands } from '@/features/brands/service'
import { aiIsLive } from '@/lib/ai/provider'
import { searchIsLive } from '@/lib/search'
import { organizationProviderId } from '@/server/org-provider'
import { Logo } from '@/components/layout/logo'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { BrandSwitcher } from '@/components/layout/brand-switcher'
import { MobileNav } from '@/components/layout/mobile-nav'
import { UserMenu } from '@/components/layout/user-menu'
import { DemoBadge } from '@/components/layout/demo-badge'
import { LibrarySearchBox } from '@/components/layout/library-search-box'
import { ROLE_LABELS } from '@/features/organizations/domain'

export default async function AppLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const context = await requireOrganization()
  const brands = await listBrands()
  const params = (await searchParams) ?? {}
  const requestedBrandId = typeof params.brandId === 'string' ? params.brandId : undefined
  const activeBrandId = brands.find((brand) => brand.id === requestedBrandId)?.id ?? brands[0]?.id ?? null

  const providerId = await organizationProviderId(context.organizationId)
  const demo = { ai: !aiIsLive(providerId), search: !searchIsLive() }

  return (
    <div className="flex min-h-dvh">
      {/* Desktop Sidebar(要件76)。幅は約250px。 */}
      <aside className="no-print sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="inline-flex">
            <Logo />
          </Link>
        </div>
        <div className="px-4 pb-4">
          <BrandSwitcher brands={brands} activeBrandId={activeBrandId} />
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3">
          <SidebarNav />
        </div>
        <div className="border-t border-line p-4">
          <Link
            href="/brands/new"
            className="flex items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-line-strong px-3 py-2.5 text-[12px] font-semibold text-ink-muted transition-colors hover:border-brand/50 hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            ブランドを追加
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <MobileNav brands={brands} activeBrandId={activeBrandId} />
            <Link href="/dashboard" className="lg:hidden">
              <Logo showText={false} />
            </Link>
            <div className="hidden min-w-0 flex-1 sm:block">
              <LibrarySearchBox />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <DemoBadge ai={demo.ai} search={demo.search} />
              <UserMenu name={user.name ?? ''} email={user.email} role={ROLE_LABELS[context.role]} />
            </div>
          </div>
        </header>

        <main className="surface-glow min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
