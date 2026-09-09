'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { deleteComment, hideContent } from '@/lib/actions/community'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { ReportDialog } from './ReportDialog'

/** コメントの操作列：本人 / admin（削除・非表示）/ 他人（通報） */
export function CommentActions({ commentId, isOwner, isAdmin, isHidden }: { commentId: string; isOwner: boolean; isAdmin: boolean; isHidden: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const onDelete = () => {
    if (!window.confirm('このコメントを削除します。よろしいですか？')) return
    start(async () => {
      const r = await deleteComment(commentId)
      if (!r.ok) return toast(r.error)
      toast('削除しました。')
      router.refresh()
    })
  }
  const onHide = () =>
    start(async () => {
      const r = await hideContent('comment', commentId, !isHidden)
      if (!r.ok) return toast(r.error)
      toast(isHidden ? '再表示しました。' : '非表示にしました。')
      router.refresh()
    })
  return (
    <div className="flex flex-wrap items-center gap-1">
      {isAdmin && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={onHide}>
          {isHidden ? <Eye /> : <EyeOff />}
          {isHidden ? '再表示' : '非表示'}
        </Button>
      )}
      {(isOwner || isAdmin) && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={onDelete} className="hover:text-state-danger">
          <Trash2 />
          削除
        </Button>
      )}
      {!isOwner && <ReportDialog targetType="comment" targetId={commentId} />}
    </div>
  )
}
