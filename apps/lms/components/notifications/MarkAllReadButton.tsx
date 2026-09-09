'use client'
import { useTransition } from 'react'
import { markAllRead } from '@/lib/actions/notifications'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const r = await markAllRead()
          if (!r.ok) return toast(r.error)
          toast('すべて既読にしました。')
        })
      }
    >
      すべて既読にする
    </Button>
  )
}
