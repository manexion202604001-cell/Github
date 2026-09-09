import Link from 'next/link'
import { requireUser, isStaff } from '@/lib/auth'
import { listChannels, listFeed } from '@/lib/db/queries/community'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ChannelChips } from '@/components/community/ChannelChips'
import { PostComposer } from '@/components/community/PostComposer'
import { PostCard } from '@/components/community/PostCard'
import { cn } from '@/lib/utils'

export const metadata = { title: 'コミュニティ' }

const TABS = [
  { value: 'all', label: 'すべて' },
  { value: 'following', label: 'フォロー中' },
] as const

/** COM-08: フィード（「すべて」「フォロー中」の 2 タブ、時系列・新しい順） */
export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ tab?: string; before?: string }> }) {
  const user = await requireUser()
  const sp = await searchParams
  const tab = sp.tab === 'following' ? 'following' : 'all'
  const viewer = { userId: user.id, isStaff: isStaff(user.profile) }
  const [channels, feed] = await Promise.all([listChannels(user.id), listFeed(viewer, { tab, before: sp.before ?? null })])
  const followingCount = channels.filter((c) => c.followed).length

  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title="コミュニティ"
        description="受講生同士の交流の場です。講師への質問は Q&A へ。"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/qa">講師に質問する（Q&A）</Link>
          </Button>
        }
      />

      <ChannelChips channels={channels} className="mb-8" />

      {channels.length > 0 && (
        <section className="mb-10">
          <PostComposer channels={channels.map((c) => ({ id: c.id, name: c.name }))} />
        </section>
      )}

      <nav className="mb-6 flex gap-6 border-b" aria-label="フィード">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === 'all' ? '/community' : `/community?tab=${t.value}`}
            aria-current={tab === t.value ? 'page' : undefined}
            className={cn(
              '-mb-px border-b pb-3 font-sans text-[13px] tracking-[0.06em] no-underline transition-colors',
              tab === t.value ? 'border-bronze-500 text-ink-900' : 'border-transparent text-stone-500 hover:text-ink-700',
            )}
          >
            {t.label}
            {t.value === 'following' && followingCount > 0 && <span className="tnum ml-1 text-stone-400">{followingCount}</span>}
          </Link>
        ))}
      </nav>

      {feed.posts.length === 0 ? (
        sp.before ? (
          <EmptyState message="これ以上の投稿はありません。" action={{ label: '最新の投稿へ', href: tab === 'all' ? '/community' : '/community?tab=following' }} />
        ) : tab === 'following' ? (
          <EmptyState
            message={followingCount === 0 ? 'フォロー中のチャンネルはまだありません。' : 'フォロー中のチャンネルに投稿はまだありません。'}
            action={{ label: 'すべての投稿を見る', href: '/community' }}
          />
        ) : (
          <EmptyState message="まだ投稿はありません。最初の一言を書いてみましょう。" action={{ label: '自己紹介チャンネルへ', href: '/community/introduce' }} />
        )
      ) : (
        <>
          <ul className="space-y-4">
            {feed.posts.map((p) => (
              <li key={p.id} className="animate-fade-up">
                <PostCard post={p} />
              </li>
            ))}
          </ul>
          {feed.nextBefore && (
            <div className="mt-8 flex justify-center">
              <Button variant="ghost" asChild>
                <Link href={`/community?tab=${tab}&before=${encodeURIComponent(feed.nextBefore)}`}>もっと見る</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
