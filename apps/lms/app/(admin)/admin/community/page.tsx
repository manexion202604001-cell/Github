import { hasRole, requireRole } from '@/lib/auth'
import { listChannelsForAdmin, listReports } from '@/lib/db/queries/community'
import { PageHeader } from '@/components/ui/PageHeader'
import { ChannelManager } from './ChannelManager'
import { ReportTable } from './ReportTable'

export const metadata = { title: 'コミュニティ管理' }

/** ADM-07: コミュニティ管理（チャンネル CRUD・通報対応）。ピン留めは各投稿ページの staff ボタンで行う */
export default async function AdminCommunityPage() {
  // app/(admin)/admin/layout.tsx は別担当。ここでも role を確認する
  const user = await requireRole('instructor')
  const isAdmin = hasRole(user.profile, 'admin')
  const [channels, reports] = await Promise.all([listChannelsForAdmin(), listReports()])
  const open = reports.filter((r) => r.resolvedAt === null).length

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="コミュニティ管理"
        description={isAdmin ? 'チャンネルの追加・並び替えと、通報された投稿への対応を行います。' : 'チャンネルの編集と通報対応は管理者のみ行えます。ピン留めは各投稿ページから行えます。'}
      />

      <section className="mb-16">
        <ChannelManager channels={channels} canEdit={isAdmin} />
      </section>

      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <p className="eyebrow">Reports</p>
          <span className="caption tnum">未対応 {open} 件</span>
        </div>
        <ReportTable reports={reports} canAct={isAdmin} />
      </section>
    </div>
  )
}
