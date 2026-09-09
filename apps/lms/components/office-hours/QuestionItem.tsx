'use client'
import { useOptimistic, useTransition } from 'react'
import { Hand, Trash2 } from 'lucide-react'
import { deleteQuestion, voteQuestion } from '@/lib/actions/office-hours'
import type { OfficeHourQuestionItem } from '@/lib/db/queries/office-hours'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { cn, formatRelative } from '@/lib/utils'

/** OH-02: 事前質問 1 件（「聞きたい」投票トグル、本人/staff の削除） */
export function QuestionItem({ question, canDelete, canVote }: { question: OfficeHourQuestionItem; canDelete: boolean; canVote: boolean }) {
  const [pending, start] = useTransition()
  const [vote, setVote] = useOptimistic({ voted: question.votedByMe, count: question.voteCount })

  const toggle = () =>
    start(async () => {
      setVote((v) => ({ voted: !v.voted, count: v.count + (v.voted ? -1 : 1) }))
      const r = await voteQuestion(question.id)
      if (!r.ok) toast(r.error)
    })

  const remove = () =>
    start(async () => {
      if (!window.confirm('この質問を削除しますか？')) return
      const r = await deleteQuestion(question.id)
      if (!r.ok) return toast(r.error)
      toast('質問を削除しました。')
    })

  return (
    <li className="flex gap-4 py-5">
      <Avatar name={question.displayName} src={question.avatarUrl} size={32} className="mt-1" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <span className="font-sans text-[13px] tracking-[0.04em] text-ink-700">{question.displayName}</span>
          <span className="caption tnum">{formatRelative(question.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[1.9]">{question.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            disabled={pending || !canVote}
            aria-pressed={vote.voted}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded border px-3 font-sans text-[12px] tracking-[0.06em] transition-colors disabled:opacity-40',
              vote.voted ? 'border-bronze-500 bg-bronze-500 text-ink-900' : 'border-stone-400 text-stone-500 hover:border-bronze-500 hover:text-bronze-500',
            )}
          >
            <Hand className="size-3.5 stroke-[1.5]" />
            聞きたい
            <span className="tnum">{vote.count}</span>
          </button>
          {canDelete && (
            <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={pending} aria-label="削除">
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
