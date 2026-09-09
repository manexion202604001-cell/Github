'use client'
import { useState, useTransition } from 'react'
import { Flag } from 'lucide-react'
import { reportContent } from '@/lib/actions/community'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { toast } from '@/components/ui/Toaster'

type TargetType = 'post' | 'comment' | 'qa_thread' | 'qa_reply'

/** COM-07: 通報ダイアログ（理由を添えて管理者に通知） */
export function ReportDialog({ targetType, targetId, size = 'sm' }: { targetType: TargetType; targetId: string; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const id = `report-${targetType}-${targetId}`

  const submit = () =>
    start(async () => {
      const r = await reportContent(targetType, targetId, reason)
      if (!r.ok) return setError(r.error)
      setError(null)
      setReason('')
      setOpen(false)
      toast('通報を受け付けました。')
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size={size}>
          <Flag />
          通報
        </Button>
      </DialogTrigger>
      <DialogContent title="通報する" description="管理者に通知されます。内容は通報した相手には伝わりません。">
        <div className="space-y-4">
          <Field label="通報理由" htmlFor={id} error={error ?? undefined}>
            <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="どのような点が問題か、簡潔にお書きください。" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={submit} disabled={pending || reason.trim().length === 0}>
              {pending ? '送信中…' : '通報する'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
