import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { countUnansweredThreads, listThreads, listUnansweredThreads } from '@/lib/db/queries/qa'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { QaThreadRow } from '@/components/qa/QaThreadRow'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Q&A 管理' }

const STATUS_TABS = [
  { value: '', label: 'すべて' },
  { value: 'open', label: '未回答' },
  { value: 'answered', label: '回答済' },
  { value: 'resolved', label: '解決済' },
] as const

/** ADM-06: Q&A 管理（未回答一覧・全スレッド一覧）。回答・FAQ 化・非公開化は各スレッド詳細の staff ボタンで行う */
export default async function AdminQaPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  // app/(admin)/admin/layout.tsx は別担当。ここでも role を確認する
  const user = await requireRole('instructor')
  const sp = await searchParams
  const status = sp.status ?? ''
  const [unanswered, counts, all] = await Promise.all([
    listUnansweredThreads(50),
    countUnansweredThreads(),
    listThreads(user.profile, { status, q: sp.q, limit: 200 }),
  ])

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Q&A 管理" description="未回答の質問に順に回答してください。回答・FAQ 化・非公開化は各スレッドで行います。" />

      <section className="mb-16">
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <p className="eyebrow">Unanswered</p>
          <span className="caption tnum">
            {counts.total} 件
            {counts.overdue > 0 && <span className="ml-2 text-state-warning">（24 時間超 {counts.overdue} 件）</span>}
          </span>
        </div>
        {unanswered.length === 0 ? (
          <p className="text-[15px] text-stone-500">未回答の質問はありません。</p>
        ) : (
          <ul className="divide-y border-y">
            {unanswered.map((t) => (
              <QaThreadRow key={t.id} thread={t} highlight={t.overdue} />
            ))}
          </ul>
        )}
        {counts.overdue > 0 && <p className="caption mt-3">左に線のある質問は投稿から 24 時間を超えています。</p>}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">All threads</p>
          <nav className="flex gap-1" aria-label="ステータス">
            {STATUS_TABS.map((t) => (
              <Link
                key={t.value}
                href={t.value ? `/admin/qa?status=${t.value}` : '/admin/qa'}
                className={cn(
                  'ui-label rounded border px-3 py-1.5 no-underline transition-colors',
                  status === t.value ? 'border-ink-900 bg-ink-900 text-paper-100 hover:text-paper-100' : 'border-transparent text-stone-500 hover:text-ink-900',
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
        <form method="get" action="/admin/qa" className="mb-4 flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <Input type="search" name="q" defaultValue={sp.q ?? ''} placeholder="タイトル・本文を検索" aria-label="検索" className="h-9 max-w-sm text-[13px]" />
        </form>
        {all.length === 0 ? (
          <EmptyState message="該当する質問はありません。" action={{ label: '絞り込みを解除', href: '/admin/qa' }} />
        ) : (
          <>
            <p className="caption tnum mb-2">{all.length} 件</p>
            <ul className="divide-y border-y">
              {all.map((t) => (
                <QaThreadRow key={t.id} thread={t} />
              ))}
            </ul>
          </>
        )}
        <p className="caption mt-6">
          <Badge variant="muted">FAQ</Badge> の付いた質問は <Link href="/faq">公開 FAQ</Link> に掲載されています。
        </p>
      </section>
    </div>
  )
}
