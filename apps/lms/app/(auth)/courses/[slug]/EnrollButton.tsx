'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'
import { enrollCourse } from '@/lib/actions/learn'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

export function EnrollButton({
  courseId,
  slug,
  enrolled,
  nextLessonId,
  completed,
}: {
  courseId: string
  slug: string
  enrolled: boolean
  nextLessonId: string | null
  completed: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (enrolled && nextLessonId) {
    return (
      <Button asChild variant={completed ? 'outline' : 'primary'}>
        <Link href={`/courses/${slug}/lessons/${nextLessonId}`}>{completed ? '復習する' : '続きから学ぶ'}</Link>
      </Button>
    )
  }
  return (
    <Button
      disabled={pending || !nextLessonId}
      onClick={() =>
        start(async () => {
          const r = await enrollCourse(courseId)
          if (!r.ok) return toast(r.error)
          toast('受講を開始しました。')
          router.push(`/courses/${slug}/lessons/${r.data.firstLessonId ?? nextLessonId}`)
        })
      }
    >
      受講を開始
    </Button>
  )
}
