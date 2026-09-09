import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getAdminStats } from '@/lib/db/queries/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/admin/StatCard'

export const metadata = { title: 'ダッシュボード' }

/** ADM-11: 管理ダッシュボード */
export default async function AdminDashboardPage() {
  await requireRole('instructor')
  const s = await getAdminStats()
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Admin" title="ダッシュボード" description="直近 7 日間の状況です。" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="WAU" value={s.wauRate} unit="%" note={`${s.wau} / ${s.members} 人が直近 7 日に活動`} />
        <StatCard label="コース完了率" value={s.completionRate} unit="%" note={`${s.completedEnrollments} / ${s.enrollments} 受講`} />
        <StatCard label="未回答の質問" value={s.unansweredQuestions} unit="件" note="ステータスが「未回答」の Q&A" />
        <StatCard label="今週の新規投稿" value={s.newPostsThisWeek} unit="件" note="コミュニティへの投稿（非表示を除く）" />
        <StatCard label="会員数" value={s.members} unit="人" note="退会済みを除く" />
        <StatCard label="退会申請中" value={s.pendingDeletions} unit="人" note="承認待ち" />
      </div>
      <nav aria-label="ショートカット" className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-[13px] tracking-wide">
        <Link href="/admin/qa">未回答の質問を確認</Link>
        <Link href="/admin/courses">コースを管理</Link>
        <Link href="/admin/members">会員を管理</Link>
        <Link href="/admin/progress">受講状況を見る</Link>
      </nav>
    </div>
  )
}
