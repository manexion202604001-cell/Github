'use client'
import { useState, useTransition } from 'react'
import { deleteOfficeHour } from '@/lib/actions/admin/office-hours'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/Toaster'

export function DeleteOfficeHourButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger" size="sm">削除</Button>
      </DialogTrigger>
      <DialogContent title="このオフィスアワーを削除しますか？" description={`「${title}」と、その事前質問・参加記録が削除されます。元に戻せません。`}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">戻る</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteOfficeHour(id)
                if (r && !r.ok) toast(r.error)
              })
            }
          >
            {pending ? '削除中…' : '削除する'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
