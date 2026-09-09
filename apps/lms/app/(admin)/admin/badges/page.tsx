import { requireRole } from '@/lib/auth'
import { listBadges, listXpRules } from '@/lib/db/queries/admin'
import { listCategories } from '@/lib/db/queries/learn'
import { PageHeader } from '@/components/ui/PageHeader'
import { XpRulesForm } from '@/components/admin/XpRulesForm'
import { BadgeEditor } from '@/components/admin/BadgeEditor'

export const metadata = { title: 'バッジ・XP' }

/** ADM-09: バッジ・XP 設定（admin のみ） */
export default async function AdminBadgesPage() {
  await requireRole('admin')
  const [rules, badges, categories] = await Promise.all([listXpRules(), listBadges(), listCategories()])
  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Gamification" title="バッジ・XP" description="XP の付与量と、バッジの獲得条件を設定します。変更は次回の付与から反映されます。" />
      <section className="space-y-4">
        <h2 className="text-[20px]">XP ルール</h2>
        <XpRulesForm rules={rules} />
      </section>
      <section className="space-y-4">
        <h2 className="text-[20px]">バッジ</h2>
        <BadgeEditor badges={badges} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
      </section>
    </div>
  )
}
