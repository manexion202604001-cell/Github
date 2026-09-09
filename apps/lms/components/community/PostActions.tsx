'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { deletePost, hideContent, pinPost, updatePost } from '@/lib/actions/community'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { toast } from '@/components/ui/Toaster'
import { ReportDialog } from './ReportDialog'

/** 投稿詳細の操作列：本人（編集・削除）/ staff（ピン留め）/ admin（非表示・削除）/ 他人（通報） */
export function PostActions({
  postId,
  bodyMd,
  isOwner,
  isStaff,
  isAdmin,
  isPinned,
  isHidden,
}: {
  postId: string
  bodyMd: string
  isOwner: boolean
  isStaff: boolean
  isAdmin: boolean
  isPinned: boolean
  isHidden: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(bodyMd)
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await fn()
      if (!r.ok) return toast(r.error ?? '処理に失敗しました。')
      toast(done)
      router.refresh()
    })

  const onDelete = () => {
    if (!window.confirm('この投稿を削除します。よろしいですか？')) return
    start(async () => {
      const r = await deletePost(postId)
      if (!r.ok) return toast(r.error)
      toast('削除しました。')
      router.push(r.data.channelSlug ? `/community/${r.data.channelSlug}` : '/community')
    })
  }

  const save = () =>
    start(async () => {
      const r = await updatePost(postId, draft)
      if (!r.ok) return setError(r.error)
      setError(null)
      setEditing(false)
      toast('保存しました。')
      router.refresh()
    })

  return (
    <div className="flex flex-wrap items-center gap-1">
      {isOwner && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setEditing(true)}>
          <Pencil />
          編集
        </Button>
      )}
      {isStaff && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => pinPost(postId, !isPinned), isPinned ? 'ピン留めを解除しました。' : 'ピン留めしました。')}>
          {isPinned ? <PinOff /> : <Pin />}
          {isPinned ? 'ピン留め解除' : 'ピン留め'}
        </Button>
      )}
      {isAdmin && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => hideContent('post', postId, !isHidden), isHidden ? '再表示しました。' : '非表示にしました。')}>
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
      {!isOwner && <ReportDialog targetType="post" targetId={postId} />}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent title="投稿を編集" className="max-w-2xl">
          <div className="space-y-4">
            <Field label="本文（Markdown 可）" htmlFor="edit-post-body" error={error ?? undefined}>
              <Textarea id="edit-post-body" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={10_000} className="min-h-[200px]" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                キャンセル
              </Button>
              <Button onClick={save} disabled={pending || draft.trim().length === 0}>
                {pending ? '保存中…' : '保存する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
