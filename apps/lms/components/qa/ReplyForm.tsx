'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { replyThread } from '@/lib/actions/qa'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { FormMessage } from '@/components/ui/FormMessage'
import { ImageUploader, type UploadedImage } from '@/components/shared/ImageUploader'
import { toast } from '@/components/ui/Toaster'

/** QA-02 / QA-03: 返信フォーム（staff は公式回答、質問者は追加コメント） */
export function ReplyForm({ threadId, isStaff }: { threadId: string; isStaff: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])

  return (
    <form
      id="reply"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const r = await replyThread(threadId, body, { imagePaths: images.map((i) => i.path) })
          if (!r.ok) return setError(r.error)
          setBody('')
          setImages([])
          toast(r.data.isOfficial ? '公式回答を投稿しました。' : 'コメントを投稿しました。')
          router.refresh()
        })
      }}
    >
      <Field label={isStaff ? '公式回答（Markdown）' : '追加の質問・補足（Markdown）'} htmlFor="reply-body">
        <Textarea id="reply-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} required />
      </Field>
      <ImageUploader max={3} value={images} onChange={setImages} />
      <FormMessage message={error} />
      <Button type="submit" variant={isStaff ? 'accent' : 'primary'} disabled={pending}>
        {pending ? '送信中…' : isStaff ? '公式回答を投稿' : 'コメントを投稿'}
      </Button>
    </form>
  )
}
