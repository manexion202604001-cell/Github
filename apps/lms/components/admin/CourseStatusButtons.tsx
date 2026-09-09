'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { deleteCourse, publishCourse, setCourseStatus } from '@/lib/actions/admin/courses'

/** ADM-01: 公開 / 下書きに戻す / アーカイブ / 削除 */
export function CourseStatusButtons({ courseId, status, firstPublish }: { courseId: string; status: 'draft' | 'published' | 'archived'; firstPublish: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) return toast(res.error ?? '処理に失敗しました。')
      toast(success)
      if (after) after()
      else router.refresh()
    })

  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'published' && (
        <Button
          variant="accent"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (firstPublish && !confirm('公開すると全会員に通知とメールが送られます。よろしいですか？')) return
            run(() => publishCourse(courseId), '公開しました。')
          }}
        >
          公開
        </Button>
      )}
      {status !== 'draft' && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setCourseStatus(courseId, 'draft'), '下書きに戻しました。')}>
          下書きに戻す
        </Button>
      )}
      {status !== 'archived' && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setCourseStatus(courseId, 'archived'), 'アーカイブしました。')}>
          アーカイブ
        </Button>
      )}
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm('コースと全レッスン・受講進捗を削除します。元に戻せません。よろしいですか？')) return
          run(() => deleteCourse(courseId), '削除しました。', () => router.push('/admin/courses'))
        }}
      >
        削除
      </Button>
    </div>
  )
}
