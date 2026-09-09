import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { listAdminCategories, listAdminCourses } from '@/lib/db/queries/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CourseTable } from '@/components/admin/CourseTable'
import { CategoryManager } from '@/components/admin/CategoryManager'

export const metadata = { title: 'コース' }

/** ADM-01: コース一覧 */
export default async function AdminCoursesPage() {
  await requireRole('instructor')
  const [courses, categories] = await Promise.all([listAdminCourses(), listAdminCategories()])
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Courses"
        title="コース"
        description="上下ボタンで表示順を変更できます。"
        actions={
          <Button asChild>
            <Link href="/admin/courses/new">新規コース</Link>
          </Button>
        }
      />
      {courses.length === 0 ? (
        <EmptyState message="コースはまだありません。" action={{ label: '最初のコースを作る', href: '/admin/courses/new' }} />
      ) : (
        <CourseTable initial={courses.map((c) => ({ ...c, lessonCount: Number(c.lessonCount) }))} />
      )}
      <section className="space-y-4">
        <h2 className="text-[20px]">カテゴリ</h2>
        <CategoryManager categories={categories.map((c) => ({ ...c, courseCount: Number(c.courseCount) }))} />
      </section>
    </div>
  )
}
