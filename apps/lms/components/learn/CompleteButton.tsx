'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { updateLessonProgress } from '@/lib/actions/learn'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

export function CompleteButton({ lessonId, completed, nextHref }: { lessonId: string; completed: boolean; nextHref: string }) {
  const [done, setDone] = useState(completed)
  const [pending, start] = useTransition()
  const router = useRouter()
  if (done) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 font-sans text-[13px] tracking-[0.06em] text-bronze-500">
        <Check className="size-4 stroke-[1.5]" />
        完了
      </span>
    )
  }
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await updateLessonProgress(lessonId, { complete: true })
          if (!r.ok) return toast(r.error)
          setDone(true)
          toast(r.data.courseCompleted ? 'コースを修了しました。' : 'レッスンを完了しました。')
          router.refresh()
          if (r.data.courseCompleted) router.push('/certificates')
          else setTimeout(() => router.push(nextHref), 600)
        })
      }
    >
      完了にする
    </Button>
  )
}
