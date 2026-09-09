import { requireUser } from '@/lib/auth'
import { listBadgesWithStatus } from '@/lib/db/queries/gamification'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { BadgeIcon } from '@/components/gamification/BadgeIcon'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'バッジ' }

/** GAME-02: 自分のバッジ + 全バッジ一覧（未獲得は条件のみ） */
export default async function BadgesPage() {
  const user = await requireUser()
  const all = await listBadgesWithStatus(user.id)
  const earned = all.filter((b) => b.earnedAt)

  return (
    <div className="space-y-12 md:space-y-16">
      <PageHeader eyebrow="Badges" title="バッジ" description={`${earned.length} / ${all.length} 個を獲得しています。`} />

      <section>
        <p className="eyebrow mb-3">Earned</p>
        {earned.length === 0 ? (
          <EmptyState message="まだバッジはありません。" action={{ label: 'コースを見る', href: '/courses' }} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((b) => (
              <li key={b.id} className="flex items-start gap-4 rounded border bg-paper-200 p-5">
                <BadgeIcon icon={b.icon} />
                <div className="min-w-0">
                  <p className="font-serif text-[16px] text-ink-900">{b.name}</p>
                  {b.description && <p className="mt-0.5 text-[13px] text-stone-500">{b.description}</p>}
                  <p className="caption tnum mt-2">{formatDate(b.earnedAt)} 獲得</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="eyebrow mb-3">All badges</p>
        <ul className="divide-y border-y">
          {all.map((b) => {
            const got = !!b.earnedAt
            return (
              <li key={b.id} className="flex items-center gap-4 py-4">
                <BadgeIcon icon={b.icon} earned={got} />
                <div className="min-w-0 flex-1">
                  <p className={got ? 'font-serif text-[15px] text-ink-900' : 'font-serif text-[15px] text-stone-400'}>{b.name}</p>
                  <p className={got ? 'text-[13px] text-stone-500' : 'text-[13px] text-stone-400'}>{b.description ?? ''}</p>
                </div>
                <span className="caption tnum shrink-0">{got ? formatDate(b.earnedAt) : '未獲得'}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
