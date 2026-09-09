'use client'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { FormMessage } from '@/components/ui/FormMessage'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { createAnnouncement, updateAnnouncement } from '@/lib/actions/admin/announcements'
import type { ActionResult } from '@/lib/action-result'
import type { Announcement } from '@/lib/db/schema'

/** ADM-10: お知らせ作成 / 編集フォーム */
export function AnnouncementForm({ announcement }: { announcement?: Announcement }) {
  const router = useRouter()
  const [state, action] = useActionState(
    async (prev: ActionResult<{ id: string }> | ActionResult | null, fd: FormData): Promise<ActionResult<{ id: string }> | ActionResult> => {
      if (announcement) {
        const res = await updateAnnouncement(announcement.id, prev as ActionResult | null, fd)
        if (res.ok) router.refresh()
        return res
      }
      const res = await createAnnouncement(prev as ActionResult<{ id: string }> | null, fd)
      if (res.ok) router.push(`/admin/announcements/${res.data.id}`)
      return res
    },
    null,
  )
  return (
    <form action={action} className="space-y-6">
      <Field label="タイトル" htmlFor="a-title">
        <Input id="a-title" name="title" required maxLength={120} defaultValue={announcement?.title ?? ''} />
      </Field>
      <Field label="本文（Markdown）" htmlFor="a-body">
        <Textarea id="a-body" name="bodyMd" required maxLength={20000} defaultValue={announcement?.bodyMd ?? ''} className="min-h-[200px]" />
      </Field>
      {state && !state.ok && <FormMessage message={state.error} />}
      {state?.ok && announcement && <FormMessage tone="success" message="保存しました。" />}
      <div className="flex flex-wrap gap-2">
        {announcement ? (
          <SubmitButton pendingText="保存中…">保存</SubmitButton>
        ) : (
          <>
            <SubmitButton variant="outline" pendingText="保存中…">下書き保存</SubmitButton>
            <SubmitButton name="publish" value="1" pendingText="公開中…">すぐに公開</SubmitButton>
          </>
        )}
      </div>
    </form>
  )
}
