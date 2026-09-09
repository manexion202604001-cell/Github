import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getRanking, parseRankingRange, RANKING_LABEL, RANKING_RANGES } from '@/lib/db/queries/gamification'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { RankingTable } from '@/components/gamification/RankingTable'
import { cn } from '@/lib/utils'

export const metadata = { title: 'ランキング' }

/** GAME-03: 「今週」「今月」「累計」タブ（?range=）。表示名・アバター・XP・順位のみ */
export default async function RankingPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUser()
  const sp = await searchParams
  const range = parseRankingRange(sp.range)
  const ranking = await getRanking(range, user.profile)

  return (
    <div>
      <PageHeader eyebrow="Ranking" title="ランキング" description="XP の獲得量による順位です。上位 20 名を表示します。" />
      <nav className="flex gap-6 border-b" aria-label="集計期間">
        {RANKING_RANGES.map((r) => (
          <Link
            key={r}
            href={r === 'weekly' ? '/ranking' : `/ranking?range=${r}`}
            aria-current={r === range ? 'page' : undefined}
            className={cn(
              '-mb-px border-b border-transparent pb-3 font-sans text-[13px] tracking-[0.06em] text-stone-500 no-underline transition-colors hover:text-ink-700',
              r === range && 'border-bronze-500 text-ink-900',
            )}
          >
            {RANKING_LABEL[r]}
          </Link>
        ))}
      </nav>
      {ranking.optedOut && (
        <p className="caption mt-4">
          ランキングには表示されない設定です。<Link href="/settings/profile">設定へ</Link>
        </p>
      )}
      <div className="mt-6">
        {ranking.top.length === 0 ? (
          <EmptyState message="まだランキングはありません。" action={{ label: 'コースを見る', href: '/courses' }} />
        ) : (
          <RankingTable rows={ranking.top} me={ranking.me} viewerId={user.id} />
        )}
      </div>
    </div>
  )
}
