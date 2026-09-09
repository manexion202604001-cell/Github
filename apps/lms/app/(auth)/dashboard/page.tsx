import Link from 'next/link'
import { and, desc, eq, gte, isNotNull, lte } from 'drizzle-orm'
import { ArrowRight } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { announcements, notifications, officeHours } from '@/lib/db/schema'
import { getLastViewedLesson, getNewCourses, listCoursesWithProgress } from '@/lib/db/queries/learn'
import { Card, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge, Dot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatDateTime, formatRelative, LEVEL_LABEL } from '@/lib/utils'

export const metadata = { title: 'ダッシュボード' }

const LESSON_TYPE_LABEL = { video: '動画', slide: 'スライド', text: 'テキスト', quiz: '小テスト' } as const

export default async function DashboardPage() {
  const user = await requireUser()
  const [last, courses, nextOh, news, notifs, newCourses] = await Promise.all([
    getLastViewedLesson(user.id),
    listCoursesWithProgress(user.id),
    db.query.officeHours.findFirst({ where: gte(officeHours.scheduledAt, new Date()), orderBy: [officeHours.scheduledAt] }),
    db
      .select()
      .from(announcements)
      .where(and(isNotNull(announcements.publishedAt), lte(announcements.publishedAt, new Date())))
      .orderBy(desc(announcements.publishedAt))
      .limit(3),
    db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(5),
    getNewCourses(4),
  ])
  const inProgress = courses.filter((c) => c.state === 'in_progress').slice(0, 3)
  const hour = new Date(Date.now() + 9 * 3600 * 1000).getUTCHours()
  const greeting = hour < 11 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは'

  return (
    <div className="space-y-12 md:space-y-16">
      <section>
        <p className="eyebrow mb-2">Dashboard</p>
        <h1 className="text-[28px] md:text-[32px]">
          {greeting}、{user.profile.displayName} さん。
        </h1>
        <p className="caption mt-2 tnum">
          {user.profile.streakDays > 0 ? `連続学習 ${user.profile.streakDays} 日` : '今日から学習をはじめましょう。'}
        </p>
      </section>

      <section>
        <p className="eyebrow mb-3">Continue</p>
        {last ? (
          <Card tone="dark" interactive className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="caption text-stone-300">{last.courseTitle}</p>
              <CardTitle className="mt-1 text-paper-100">{last.lessonTitle}</CardTitle>
              <p className="caption mt-1 text-stone-400">{LESSON_TYPE_LABEL[last.lessonType]}</p>
            </div>
            <Button variant="accent" asChild>
              <Link href={`/courses/${last.courseSlug}/lessons/${last.lessonId}`}>
                続きから学ぶ <ArrowRight />
              </Link>
            </Button>
          </Card>
        ) : (
          <Card tone="dark" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-paper-100">最初のコースをはじめましょう。</CardTitle>
              <p className="caption mt-1 text-stone-400">コース一覧から興味のあるものを選んでください。</p>
            </div>
            <Button variant="accent" asChild>
              <Link href="/courses">コースを見る <ArrowRight /></Link>
            </Button>
          </Card>
        )}
      </section>

      {inProgress.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="eyebrow">In progress</p>
            <Link href="/courses?state=in_progress" className="caption">すべて見る</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {inProgress.map((c) => (
              <Link key={c.id} href={`/courses/${c.slug}`} className="no-underline hover:text-ink-700">
                <Card interactive className="h-full">
                  <div className="mb-3 flex gap-2">
                    {c.categoryName && <Badge>{c.categoryName}</Badge>}
                    <Badge>{LEVEL_LABEL[c.level]}</Badge>
                  </div>
                  <CardTitle>{c.title}</CardTitle>
                  <ProgressBar value={c.progress} className="mt-4" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="eyebrow mb-3">Office hour</p>
        {nextOh ? (
          <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="caption tnum">{formatDateTime(nextOh.scheduledAt)}</p>
              <CardTitle className="mt-1">{nextOh.title}</CardTitle>
              {nextOh.theme && <p className="mt-1 text-[14px] text-stone-500">{nextOh.theme}</p>}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/office-hours/${nextOh.id}`}>詳細・事前質問</Link>
            </Button>
          </Card>
        ) : (
          <p className="text-[15px] text-stone-500">次回のオフィスアワーは調整中です。</p>
        )}
      </section>

      <div className="grid gap-12 md:grid-cols-2">
        <section>
          <p className="eyebrow mb-3">Announcements</p>
          {news.length === 0 ? (
            <p className="text-[15px] text-stone-500">お知らせはまだありません。</p>
          ) : (
            <ul className="divide-y border-y">
              {news.map((a) => (
                <li key={a.id} className="py-4">
                  <p className="caption tnum">{formatDate(a.publishedAt)}</p>
                  <p className="mt-1 font-serif">{a.title}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="eyebrow">Notifications</p>
            <Link href="/notifications" className="caption">すべて見る</Link>
          </div>
          {notifs.length === 0 ? (
            <p className="text-[15px] text-stone-500">通知はまだありません。</p>
          ) : (
            <ul className="divide-y border-y">
              {notifs.map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-4">
                  <span className="pt-2">{!n.readAt ? <Dot /> : <span className="inline-block size-1.5" />}</span>
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link href={n.link} className="font-serif text-[15px] no-underline hover:text-bronze-500">{n.title}</Link>
                    ) : (
                      <p className="font-serif text-[15px]">{n.title}</p>
                    )}
                    <p className="caption tnum mt-0.5">{formatRelative(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {newCourses.length > 0 && (
        <section>
          <p className="eyebrow mb-3">New courses</p>
          <ul className="divide-y border-y">
            {newCourses.map((c) => (
              <li key={c.id}>
                <Link href={`/courses/${c.slug}`} className="flex items-center justify-between gap-4 py-4 no-underline hover:text-bronze-500">
                  <span className="font-serif text-[15px]">{c.title}</span>
                  <span className="flex shrink-0 gap-2">
                    {c.categoryName && <Badge>{c.categoryName}</Badge>}
                    <Badge>{LEVEL_LABEL[c.level]}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
