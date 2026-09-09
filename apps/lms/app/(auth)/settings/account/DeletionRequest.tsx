'use client'
import { useState, useTransition } from 'react'
import { cancelDeletionRequest, requestDeletion } from '@/lib/actions/settings'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'

/** AUTH-06: 退会申請（確認ダイアログ → 申請。申請中は取り消し可） */
export function DeletionRequest({ requestedAt }: { requestedAt: string | null }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  if (requestedAt) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <Badge variant="status">退会申請中</Badge>
        <span className="caption tnum">{requestedAt} に申請</span>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelDeletionRequest()
              if (!r.ok) return toast(r.error)
              toast('退会申請を取り消しました。')
            })
          }
        >
          申請を取り消す
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger">退会を申請する</Button>
      </DialogTrigger>
      <DialogContent title="退会を申請しますか？" description="管理者の確認後に退会となります。申請は取り消せます。">
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">戻る</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await requestDeletion()
                if (!r.ok) return toast(r.error)
                setOpen(false)
                toast('退会を申請しました。')
              })
            }
          >
            {pending ? '送信中…' : '申請する'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
