import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, Lock, PlayCircle, FileText, Presentation, ListChecks } from 'lucide-react'
import { requireUser, isStaff } from '@/lib/auth'
import { getCourseOutline } from '@/lib/db/queries/learn'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar } from '@/components/ui/Avatar'
import { Markdown } from '@/components/ui/Markdown'
import { EnrollButton } from './EnrollButton'
import { LEVEL_LABEL, cn } from '@/lib/utils'
import { isLessonUnlocked } from '@/lib/xp'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: decodeURIComponent(slug) }
}

const ICON = { video: PlayCircle, slide: Presentation, text: FileText, quiz: ListChecks } as const

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser()
  const { slug } = await params
  const outline = await getCourseOutline(slug, user.id, isStaff(user.profile))
  if (!outline) notFound()
  const { course, sections, completed, progress, enrollment, lessonOrder } = outline
  const nextLessonId = lessonOrder.find((id) => !completed.has(id)) ?? lessonOrder[0] ?? null

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
      <div>
        <PageHeader
          eyebrow={course.categoryName ?? 'Course'}
          title={course.title}
          actions={<EnrollButton courseId={course.id} slug={course.slug} enrolled={!!enrollment} nextLessonId={nextLessonId} completed={!!enrollment?.completedAt} />}
        />
        <div className="mb-8 flex flex-wrap gap-2">
          <Badge>{LEVEL_LABEL[course.level]}</Badge>
          <Badge>{course.durationWeeks} 週間</Badge>
          <Badge>{lessonOrder.length} レッスン</Badge>
          {course.isSequential && <Badge>順番に受講</Badge>}
          {course.status !== 'published' && <Badge variant="muted">{course.status === 'draft' ? '下書き' : 'アーカイブ'}</Badge>}
        </div>
        {course.description && <Markdown className="mb-10">{course.description}</Markdown>}
        {course.goals && course.goals.length > 0 && (
          <section className="mb-10">
            <p className="eyebrow mb-3">Goals</p>
            <ul className="space-y-2">
              {course.goals.map((g, i) => (
                <li key={i} className="flex gap-3 font-serif text-[15px]">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-bronze-500" />
                  {g}
                </li>
              ))}
            </ul>
          </section>
        )}
        {outline.instructor && (
          <section className="border-t pt-8">
            <p className="eyebrow mb-3">Instructor</p>
            <div className="flex items-start gap-4">
              <Avatar name={outline.instructor.displayName} src={outline.instructor.avatarUrl} size={44} />
              <div>
                <Link href={`/members/${outline.instructor.id}`} className="font-serif no-underline hover:text-bronze-500">{outline.instructor.displayName}</Link>
                {outline.instructor.bio && <p className="mt-1 text-[14px] text-stone-500">{outline.instructor.bio}</p>}
              </div>
            </div>
          </section>
        )}
      </div>

      <aside>
        <div className="sticky top-24 rounded border bg-paper-200 p-6">
          <p className="eyebrow mb-2">Progress</p>
          <ProgressBar value={progress} />
          <div className="mt-6 space-y-6">
            {sections.map((s) => (
              <div key={s.id}>
                <p className="ui-label mb-2 text-stone-500">{s.title}</p>
                <ul className="space-y-1">
                  {s.lessons.map((l) => {
                    const done = completed.has(l.id)
                    const unlocked = isLessonUnlocked(course.isSequential, lessonOrder, l.id, completed) || isStaff(user.profile)
                    const Icon = ICON[l.type]
                    const inner = (
                      <>
                        <span className={cn('flex size-5 shrink-0 items-center justify-center', done ? 'text-bronze-500' : 'text-stone-400')}>
                          {done ? <Check className="size-4 stroke-[1.5]" /> : unlocked ? <Icon className="size-4 stroke-[1.5]" /> : <Lock className="size-4 stroke-[1.5]" />}
                        </span>
                        <span className="flex-1 font-sans text-[13px] tracking-[0.04em]">{l.title}</span>
                        {l.durationMin && <span className="caption tnum">{l.durationMin}分</span>}
                      </>
                    )
                    return (
                      <li key={l.id}>
                        {unlocked ? (
                          <Link href={`/courses/${course.slug}/lessons/${l.id}`} className="flex items-center gap-2 rounded px-2 py-1.5 no-underline hover:bg-paper-100">
                            {inner}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2 px-2 py-1.5 text-stone-400" aria-disabled>
                            {inner}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {lessonOrder.length === 0 && <p className="caption">レッスンは準備中です。</p>}
          </div>
        </div>
      </aside>
    </div>
  )
}
