'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createThread } from '@/lib/actions/qa'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Field, Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { FormMessage } from '@/components/ui/FormMessage'
import { ImageUploader, type UploadedImage } from '@/components/shared/ImageUploader'
import { toast } from '@/components/ui/Toaster'

/** QA-01 / QA-08: 質問投稿フォーム */
export function NewThreadForm({
  courses,
  initialCourseId,
  lesson,
}: {
  courses: { id: string; title: string }[]
  initialCourseId: string | null
  lesson: { id: string; title: string; courseId: string } | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [courseId, setCourseId] = useState(lesson?.courseId ?? initialCourseId ?? '')
  const [attachLesson, setAttachLesson] = useState(!!lesson)
  const [isPrivate, setIsPrivate] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const lessonLocked = !!lesson && attachLesson

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const r = await createThread({
            title,
            bodyMd: body,
            courseId: courseId || null,
            lessonId: lessonLocked ? lesson.id : null,
            isPrivate,
            imagePaths: images.map((i) => i.path),
          })
          if (!r.ok) return setError(r.error)
          toast('質問を投稿しました。')
          router.push(`/qa/${r.data.id}`)
        })
      }}
    >
      <Field label="タイトル" htmlFor="qa-title" hint="何に困っているかが一目で分かる一文にすると、回答が早くなります。">
        <Input id="qa-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required autoFocus />
      </Field>
      <Field label="本文（Markdown）" htmlFor="qa-body" hint="試したこと・期待する結果・実際の結果を書いてください。">
        <Textarea id="qa-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="min-h-[240px]" required />
      </Field>
      <Field label="関連コース（任意）" htmlFor="qa-course">
        <Select id="qa-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={lessonLocked}>
          <option value="">選択しない</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </Select>
      </Field>
      {lesson && (
        <div className="flex items-start gap-3">
          <Checkbox id="qa-lesson" checked={attachLesson} onCheckedChange={(v) => setAttachLesson(v === true)} className="mt-1" />
          <Label htmlFor="qa-lesson" className="mb-0 cursor-pointer text-[13px] text-ink-700">
            レッスン「{lesson.title}」に関する質問として投稿する
          </Label>
        </div>
      )}
      <div>
        <Label>画像（最大 3 枚・各 5MB）</Label>
        <ImageUploader max={3} value={images} onChange={setImages} />
      </div>
      <div className="flex items-start gap-3 border-t pt-6">
        <Checkbox id="qa-private" checked={isPrivate} onCheckedChange={(v) => setIsPrivate(v === true)} className="mt-1" />
        <div>
          <Label htmlFor="qa-private" className="mb-0 cursor-pointer text-[13px] text-ink-700">非公開で質問する</Label>
          <p className="caption mt-0.5">自分と講師だけが閲覧できます。通常は他の受講生の学びにもなるため、公開をおすすめします。</p>
        </div>
      </div>
      <FormMessage message={error} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? '投稿中…' : '質問を投稿'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>キャンセル</Button>
      </div>
    </form>
  )
}
