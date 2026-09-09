import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireUser, hasRole, isStaff } from '@/lib/auth'
import { getPostDetail } from '@/lib/db/queries/community'
import { PostCard } from '@/components/community/PostCard'
import { PostActions } from '@/components/community/PostActions'
import { CommentList } from '@/components/community/CommentList'
import { CommentForm } from '@/components/community/CommentForm'
import { truncate } from '@/lib/utils'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  if (!UUID_RE.test(postId)) return { title: 'コミュニティ' }
  const user = await requireUser()
  const post = await getPostDetail(postId, { userId: user.id, isStaff: isStaff(user.profile) })
  return { title: post ? `${truncate(post.bodyMd.replace(/\s+/g, ' '), 40)} | コミュニティ` : 'コミュニティ' }
}

/** COM-02〜07: 投稿詳細（コメント 1 階層・リアクション・通報・編集/削除・staff のピン留め/非表示） */
export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const user = await requireUser()
  const { postId } = await params
  if (!UUID_RE.test(postId)) notFound()
  const staff = isStaff(user.profile)
  const admin = hasRole(user.profile, 'admin')
  const post = await getPostDetail(postId, { userId: user.id, isStaff: staff })
  if (!post) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/community/${post.channel.slug}`} className="inline-flex items-center gap-2 font-sans text-[13px] tracking-[0.06em] text-stone-500 no-underline hover:text-bronze-500">
          <ArrowLeft className="size-4 stroke-[1.5]" aria-hidden />
          #{post.channel.name}
        </Link>
        <p className="eyebrow">Community</p>
      </div>

      <PostCard
        post={post}
        variant="detail"
        actions={
          <PostActions
            postId={post.id}
            bodyMd={post.bodyMd}
            isOwner={post.author.id === user.id}
            isStaff={staff}
            isAdmin={admin}
            isPinned={post.isPinned}
            isHidden={post.isHidden}
          />
        }
      />

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="eyebrow">Comments</p>
          <span className="caption tnum">{post.comments.filter((c) => !c.isHidden).length} 件</span>
        </div>
        <CommentList comments={post.comments} mentions={post.mentions} viewerId={user.id} isAdmin={admin} />
        <div className="mt-8">
          <CommentForm postId={post.id} />
        </div>
      </section>

      <p className="caption mt-12 text-center">
        講師への質問は{' '}
        <Link href="/qa" className="text-ink-700">
          Q&A
        </Link>{' '}
        へお願いします。
      </p>
    </div>
  )
}
