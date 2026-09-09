'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createComment } from '@/lib/actions/community'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { FormMessage } from '@/components/ui/FormMessage'
import { toast } from '@/components/ui/Toaster'

/** COM-03: コメント投稿（1 階層） */
export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const submit = () =>
    start(async () => {
      const r = await createComment(postId, body)
      if (!r.ok) return setError(r.error)
      setError(null)
      setBody('')
      toast('コメントしました。')
      router.refresh()
    })
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field label="コメント（Markdown 可）" htmlFor="comment-body">
        <Textarea id="comment-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={10_000} className="min-h-[96px]" placeholder="@表示名 でメンションできます。" />
      </Field>
      <div className="flex items-center justify-end gap-3">
        <FormMessage message={error} />
        <Button type="submit" size="sm" disabled={pending || body.trim().length === 0}>
          {pending ? '送信中…' : 'コメントする'}
        </Button>
      </div>
    </form>
  )
}
