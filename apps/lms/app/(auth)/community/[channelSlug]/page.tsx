import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser, isStaff } from '@/lib/auth'
import { getChannelBySlug, listChannels, listFeed, listPinnedPosts } from '@/lib/db/queries/community'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ChannelChips } from '@/components/community/ChannelChips'
import { ChannelFollowButton } from '@/components/community/ChannelFollowButton'
import { PostComposer } from '@/components/community/PostComposer'
import { PostCard } from '@/components/community/PostCard'

export async function generateMetadata({ params }: { params: Promise<{ channelSlug: string }> }) {
  const { channelSlug } = await params
  const channel = await getChannelBySlug(channelSlug)
  return { title: channel ? `${channel.name} | コミュニティ` : 'コミュニティ' }
}

/** COM-01/06: チャンネルページ（説明・フォロー・ピン留め投稿・投稿フォーム・時系列フィード） */
export default async function ChannelPage({ params, searchParams }: { params: Promise<{ channelSlug: string }>; searchParams: Promise<{ before?: string }> }) {
  const user = await requireUser()
  const [{ channelSlug }, sp] = await Promise.all([params, searchParams])
  const channel = await getChannelBySlug(channelSlug)
  if (!channel) notFound()
  const viewer = { userId: user.id, isStaff: isStaff(user.profile) }
  const [channels, pinned, feed] = await Promise.all([
    listChannels(user.id),
    sp.before ? Promise.resolve([]) : listPinnedPosts(viewer, channel.id),
    listFeed(viewer, { channelId: channel.id, before: sp.before ?? null }),
  ])
  const me = channels.find((c) => c.id === channel.id)
  const pinnedIds = new Set(pinned.map((p) => p.id))
  const posts = feed.posts.filter((p) => !pinnedIds.has(p.id))

  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title={channel.name}
        description={channel.description ?? '受講生同士の交流の場です。講師への質問は Q&A へ。'}
        actions={
          <>
            <ChannelFollowButton channelId={channel.id} followed={me?.followed ?? false} />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/qa">Q&A へ</Link>
            </Button>
          </>
        }
      />

      <ChannelChips channels={channels} activeSlug={channel.slug} className="mb-8" />

      <section className="mb-10">
        <PostComposer channelId={channel.id} channelName={channel.name} />
      </section>

      {pinned.length > 0 && (
        <section className="mb-10">
          <p className="eyebrow mb-3">Pinned</p>
          <ul className="space-y-4">
            {pinned.map((p) => (
              <li key={p.id}>
                <PostCard post={p} showChannel={false} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="eyebrow mb-3">Posts</p>
        {posts.length === 0 ? (
          sp.before ? (
            <EmptyState message="これ以上の投稿はありません。" action={{ label: '最新の投稿へ', href: `/community/${channel.slug}` }} />
          ) : (
            <EmptyState message={pinned.length > 0 ? 'ピン留め以外の投稿はまだありません。' : 'このチャンネルにはまだ投稿がありません。'} action={{ label: 'すべての投稿を見る', href: '/community' }} />
          )
        ) : (
          <>
            <ul className="space-y-4">
              {posts.map((p) => (
                <li key={p.id} className="animate-fade-up">
                  <PostCard post={p} showChannel={false} />
                </li>
              ))}
            </ul>
            {feed.nextBefore && (
              <div className="mt-8 flex justify-center">
                <Button variant="ghost" asChild>
                  <Link href={`/community/${channel.slug}?before=${encodeURIComponent(feed.nextBefore)}`}>もっと見る</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
