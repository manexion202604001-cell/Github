import { requireUser } from '@/lib/auth'
import { getLessonForQa, listCoursesForQa } from '@/lib/db/queries/qa'
import { PageHeader } from '@/components/ui/PageHeader'
import { NewThreadForm } from '@/components/qa/NewThreadForm'

export const metadata = { title: '質問する' }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function NewQaPage({ searchParams }: { searchParams: Promise<{ course?: string; lesson?: string }> }) {
  await requireUser()
  const sp = await searchParams
  const [courses, lesson] = await Promise.all([listCoursesForQa(), sp.lesson && UUID_RE.test(sp.lesson) ? getLessonForQa(sp.lesson) : null])
  const initialCourseId = sp.course && courses.some((c) => c.id === sp.course) ? sp.course : null

  return (
    <div className="mx-auto max-w-prose">
      <PageHeader eyebrow="Official Q&A" title="質問する" description="講師が回答します。受講生同士の相談はコミュニティの「つまずき相談」へ。" />
      <NewThreadForm courses={courses} initialCourseId={initialCourseId} lesson={lesson} />
    </div>
  )
}
