'use client'
import { useEffect, useRef, useState } from 'react'
import { saveLessonNote } from '@/lib/actions/learn'
import { Textarea } from '@/components/ui/Input'

/** LEARN-11: 自分だけのメモ（Markdown、1.5 秒デバウンスで自動保存） */
export function LessonNotes({ lessonId, initial }: { lessonId: string; initial: string }) {
  const [value, setValue] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (timer.current) clearTimeout(timer.current)
    setStatus('saving')
    timer.current = setTimeout(async () => {
      const r = await saveLessonNote(lessonId, value)
      setStatus(r.ok ? 'saved' : 'error')
    }, 1500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, lessonId])

  return (
    <div>
      <Textarea
        aria-label="レッスンのメモ"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="このレッスンのメモ（Markdown 可）。自分だけが見られます。"
        className="min-h-[200px] font-mono text-[13px]"
      />
      <p className="caption mt-2" aria-live="polite">
        {status === 'saving' && '保存中…'}
        {status === 'saved' && '保存しました。'}
        {status === 'error' && '保存に失敗しました。'}
      </p>
    </div>
  )
}
