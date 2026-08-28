import Link from 'next/link'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
        title="設定"
        description="プロフィール・組織・メンバー・ブランドルール・AIの設定を管理します。"
        action={
          <Link href="/brands" className="text-[13px] font-semibold text-brand hover:underline">
            ブランド一覧へ
          </Link>
        }
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </PageShell>
  )
}
