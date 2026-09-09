import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { getAdminLesson } from '@/lib/db/queries/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { LessonForm } from '@/components/admin/LessonForm'
import { QuizEditor } from '@/components/admin/QuizEditor'

export const metadata = { title: 'レッスン編集' }

export default async function AdminLessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  await requireRole('instructor')
  const { id, lessonId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound()
  const detail = await getAdminLesson(lessonId)
  if (!detail || detail.course.id !== id) notFound()
  const { lesson, section, course, attachments, quiz } = detail
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow={`${course.title} / ${section.title}`}
        title={lesson.title}
        actions={
          <div className="flex items-center gap-4">
            <Link href={`/admin/courses/${course.id}`} className="caption">コースに戻る</Link>
            <Link href={`/courses/${course.slug}/lessons/${lesson.id}`} className="caption inline-flex items-center gap-1" target="_blank">
              プレビュー <ExternalLink className="size-3 stroke-[1.5]" />
            </Link>
          </div>
        }
      />
      <div className="max-w-prose">
        <LessonForm lesson={lesson} attachments={attachments} />
      </div>
      {lesson.type === 'quiz' && (
        <section className="max-w-prose space-y-6">
          <h2 className="text-[20px]">小テスト</h2>
          <QuizEditor lessonId={lesson.id} initial={quiz} />
        </section>
      )}
    </div>
  )
}
