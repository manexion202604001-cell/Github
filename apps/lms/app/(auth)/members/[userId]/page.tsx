import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getPublicProfile } from '@/lib/db/queries/gamification'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { BadgeIcon } from '@/components/gamification/BadgeIcon'
import { formatDate } from '@/lib/utils'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata = { title: 'プロフィール' }

/** 公開プロフィール（メールは出さない。is_public=false は本人・admin 以外 404） */
export default async function MemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const user = await requireUser()
  const { userId } = await params
  if (!UUID_RE.test(userId)) notFound()
  const p = await getPublicProfile(userId, user.profile)
  if (!p) notFound()

  return (
    <div className="mx-auto max-w-prose space-y-12">
      <section className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <Avatar name={p.displayName} src={p.avatarUrl} size={80} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">Member</p>
          <h1 className="text-[28px] md:text-[32px]">{p.displayName}</h1>
          <p className="caption tnum mt-2">
            Lv.{p.level.level} ・ {p.totalXp.toLocaleString('ja-JP')} XP
            {p.streakDays > 0 && ` ・ 連続学習 ${p.streakDays} 日`}
          </p>
          <ProgressBar value={p.level.progress * 100} label="次のレベルまで" showValue={false} className="mt-3 max-w-xs" />
        </div>
      </section>

      {!p.isPublic && (
        <p className="caption">
          このプロフィールは非公開です。{p.isSelf && <Link href="/settings/profile">設定へ</Link>}
        </p>
      )}

      {p.bio && (
        <section>
          <p className="eyebrow mb-3">About</p>
          <p className="whitespace-pre-wrap text-[15px] leading-[1.9]">{p.bio}</p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded border bg-paper-200 p-5">
          <p className="eyebrow">Courses completed</p>
          <p className="tnum mt-2 font-serif text-[28px] text-ink-900">{p.completedCourses}</p>
        </div>
        <div className="rounded border bg-paper-200 p-5">
          <p className="eyebrow">Badges</p>
          <p className="tnum mt-2 font-serif text-[28px] text-ink-900">{p.badges.length}</p>
        </div>
      </section>

      <section>
        <p className="eyebrow mb-3">Badges</p>
        {p.badges.length === 0 ? (
          <p className="text-[15px] text-stone-500">まだバッジはありません。</p>
        ) : (
          <ul className="divide-y border-y">
            {p.badges.map((b) => (
              <li key={b.id} className="flex items-center gap-4 py-4">
                <BadgeIcon icon={b.icon} />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[15px] text-ink-900">{b.name}</p>
                  {b.description && <p className="text-[13px] text-stone-500">{b.description}</p>}
                </div>
                <span className="caption tnum shrink-0">{formatDate(b.earnedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
