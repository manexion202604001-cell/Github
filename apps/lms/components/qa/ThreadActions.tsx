'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookmarkCheck, BookmarkPlus, Check, Lock, LockOpen } from 'lucide-react'
import { setThreadPrivate, toggleFaq, updateThreadStatus } from '@/lib/actions/qa'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import type { ActionResult } from '@/lib/action-result'
import type { QaStatus } from '@/lib/db/queries/qa'

type Props = {
  threadId: string
  status: QaStatus
  isFaq: boolean
  isPrivate: boolean
  isOwner: boolean
  isStaff: boolean
}

/** QA-04 / QA-05 / ADM-06: 質問者向け「解決済みにする」、staff 向け status 変更・FAQ 化・非公開化 */
export function ThreadActions({ threadId, status, isFaq, isPrivate, isOwner, isStaff }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<ActionResult<unknown>>, done: string) =>
    start(async () => {
      const r = await fn()
      if (!r.ok) return toast(r.error)
      toast(done)
      router.refresh()
    })

  if (!isOwner && !isStaff) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwner && status !== 'resolved' && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => updateThreadStatus(threadId, 'resolved'), '解決済みにしました。')}>
          <Check />
          解決済みにする
        </Button>
      )}
      {isStaff && (
        <>
          <Select
            aria-label="ステータス"
            value={status}
            disabled={pending}
            onChange={(e) => run(() => updateThreadStatus(threadId, e.target.value), 'ステータスを変更しました。')}
            className="h-9 w-auto text-[13px]"
          >
            <option value="open">未回答</option>
            <option value="answered">回答済</option>
            <option value="resolved">解決済</option>
          </Select>
          <Button size="sm" variant="ghost" disabled={pending || isPrivate} title={isPrivate ? '非公開の質問は FAQ にできません' : undefined} onClick={() => run(() => toggleFaq(threadId), isFaq ? 'FAQ から外しました。' : 'FAQ に追加しました。')}>
            {isFaq ? <BookmarkCheck /> : <BookmarkPlus />}
            {isFaq ? 'FAQ から外す' : 'FAQ に追加'}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setThreadPrivate(threadId, !isPrivate), isPrivate ? '公開にしました。' : '非公開にしました。')}>
            {isPrivate ? <LockOpen /> : <Lock />}
            {isPrivate ? '公開にする' : '非公開にする'}
          </Button>
        </>
      )}
    </div>
  )
}
