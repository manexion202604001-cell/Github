'use client'
import { useState, useTransition } from 'react'
import { submitQuestion } from '@/lib/actions/office-hours'
import { Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

/** OH-02: 事前質問フォーム */
export function QuestionForm({ officeHourId }: { officeHourId: string }) {
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await submitQuestion(officeHourId, body)
          if (!r.ok) return toast(r.error)
          setBody('')
          toast('質問を投稿しました。')
        })
      }}
    >
      <Field label="事前質問" htmlFor="oh-question" hint="1000 文字以内。当日、投票の多い質問から取り上げます。">
        <Textarea id="oh-question" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} required placeholder="聞きたいことを書いてください" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || body.trim().length === 0}>
          {pending ? '送信中…' : '質問を投稿'}
        </Button>
      </div>
    </form>
  )
}
