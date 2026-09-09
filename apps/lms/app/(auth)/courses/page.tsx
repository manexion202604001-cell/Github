import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { listCategories, listCoursesWithProgress } from '@/lib/db/queries/learn'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { LEVEL_LABEL } from '@/lib/utils'
import { CourseFilters } from './CourseFilters'

export const metadata = { title: 'コース' }

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; level?: string; state?: string; sort?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const [courses, categories] = await Promise.all([
    listCoursesWithProgress(user.id, { category: sp.category, level: sp.level, state: sp.state, sort: sp.sort }),
    listCategories(),
  ])
  const STATE_LABEL = { not_started: '未着手', in_progress: '受講中', completed: '完了' } as const

  return (
    <div>
      <PageHeader eyebrow="Courses" title="コース" description="カテゴリ・難易度で絞り込めます。各コースの想定学習期間は 2 週間です。" />
      <CourseFilters categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
      {courses.length === 0 ? (
        <EmptyState message="該当するコースはありません。" action={{ label: '絞り込みを解除', href: '/courses' }} />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.slug}`} className="no-underline hover:text-ink-700">
              <Card interactive className="flex h-full flex-col">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {c.categoryName && <Badge>{c.categoryName}</Badge>}
                  <Badge>{LEVEL_LABEL[c.level]}</Badge>
                  {c.state !== 'not_started' && <Badge variant="status">{STATE_LABEL[c.state]}</Badge>}
                  {c.status === 'draft' && <Badge variant="muted">下書き</Badge>}
                </div>
                <CardTitle>{c.title}</CardTitle>
                {c.description && <CardDescription className="line-clamp-2">{c.description}</CardDescription>}
                <div className="mt-auto pt-6">
                  <p className="caption tnum mb-2">
                    {c.lessonCount} レッスン ・ {c.durationWeeks} 週間
                  </p>
                  <ProgressBar value={c.progress} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
