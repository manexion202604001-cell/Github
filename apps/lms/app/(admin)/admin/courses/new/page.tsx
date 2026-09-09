import { requireRole } from '@/lib/auth'
import { listCategories } from '@/lib/db/queries/learn'
import { PageHeader } from '@/components/ui/PageHeader'
import { CourseForm } from '@/components/admin/CourseForm'

export const metadata = { title: '新規コース' }

export default async function NewCoursePage() {
  await requireRole('instructor')
  const categories = await listCategories()
  return (
    <div className="max-w-prose space-y-8">
      <PageHeader eyebrow="Courses" title="新規コース" description="作成後は下書きとして保存されます。セクション・レッスンは作成後に追加できます。" />
      <CourseForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  )
}
