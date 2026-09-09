import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { getAdminCourse } from '@/lib/db/queries/admin'
import { listCategories } from '@/lib/db/queries/learn'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { CourseForm } from '@/components/admin/CourseForm'
import { CourseOutline } from '@/components/admin/CourseOutline'
import { CourseStatusButtons } from '@/components/admin/CourseStatusButtons'
import { COURSE_STATUS_LABEL } from '@/components/admin/CourseTable'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'コース編集' }

export default async function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('instructor')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [detail, categories] = await Promise.all([getAdminCourse(id), listCategories()])
  if (!detail) notFound()
  const { course, sections } = detail
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Courses"
        title={course.title}
        description={course.publishedAt ? `公開日: ${formatDate(course.publishedAt)}` : undefined}
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <Badge variant={course.status === 'published' ? 'status' : course.status === 'archived' ? 'muted' : 'tag'}>{COURSE_STATUS_LABEL[course.status]}</Badge>
              <Link href={`/courses/${course.slug}`} className="caption inline-flex items-center gap-1" target="_blank">
                会員画面で見る <ExternalLink className="size-3 stroke-[1.5]" />
              </Link>
            </div>
            <CourseStatusButtons courseId={course.id} status={course.status} firstPublish={!course.publishedAt} />
          </div>
        }
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <h2 className="text-[20px]">基本情報</h2>
          <CourseForm course={course} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </section>
        <section className="space-y-6">
          <h2 className="text-[20px]">セクション・レッスン</h2>
          <p className="caption">ドラッグまたは上下ボタンで並び替えできます。レッスン名を選ぶと内容を編集できます。</p>
          <CourseOutline courseId={course.id} initial={sections} />
        </section>
      </div>
    </div>
  )
}
