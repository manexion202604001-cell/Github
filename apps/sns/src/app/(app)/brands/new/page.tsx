import type { Metadata } from 'next'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { BrandForm } from '@/components/brands/brand-form'

export const metadata: Metadata = { title: 'ブランドを追加' }

export default function NewBrandPage() {
  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        crumbs={[{ label: 'Brands', href: '/brands' }, { label: 'ブランドを追加' }]}
        title="ブランドを追加"
        description="複数ブランド・複数クライアントを1つの組織で管理できます。"
      />
      <div className="mt-8">
        <BrandForm mode="create" />
      </div>
    </PageShell>
  )
}
