import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireOrganization } from '@/server/authz'
import { listBrands } from '@/features/brands/service'
import { OnboardingWizard } from './wizard'

export const metadata: Metadata = { title: '初期設定' }

export default async function OnboardingPage() {
  await requireOrganization()
  // すでにブランドがある場合は初期設定を飛ばす。
  const brands = await listBrands()
  if (brands.length > 0) redirect('/dashboard')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <OnboardingWizard />
    </div>
  )
}
