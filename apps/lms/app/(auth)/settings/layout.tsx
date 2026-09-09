import { PageHeader } from '@/components/ui/PageHeader'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader eyebrow="Settings" title="設定" className="mb-6 md:mb-8" />
      <SettingsNav />
      {children}
    </div>
  )
}
