'use client'
import { useState, useTransition } from 'react'
import { ExternalLink } from 'lucide-react'
import { markAttendance } from '@/lib/actions/office-hours'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

/**
 * OH-05: 「参加する」— 参加を記録し、参加リンクを新規タブで開く。
 * 開催時刻の前後 3 時間以外は記録せずリンクのみ。
 */
export function AttendButton({
  officeHourId,
  joinUrl,
  canAttend,
  attended,
}: {
  officeHourId: string
  joinUrl: string | null
  canAttend: boolean
  attended: boolean
}) {
  const [done, setDone] = useState(attended)
  const [pending, start] = useTransition()

  const record = () => {
    if (done) return
    start(async () => {
      const r = await markAttendance(officeHourId)
      if (!r.ok) return toast(r.error)
      setDone(true)
      if (r.data.first) toast('参加を記録しました。')
    })
  }

  if (joinUrl) {
    if (!canAttend) {
      return (
        <Button variant="outline" asChild>
          <a href={joinUrl} target="_blank" rel="noopener noreferrer">
            参加リンクを開く <ExternalLink />
          </a>
        </Button>
      )
    }
    return (
      <Button variant="accent" asChild>
        <a href={joinUrl} target="_blank" rel="noopener noreferrer" onClick={record} aria-busy={pending}>
          {done ? '参加中（リンクを開く）' : '参加する'} <ExternalLink />
        </a>
      </Button>
    )
  }
  return (
    <Button variant="accent" onClick={record} disabled={!canAttend || done || pending}>
      {done ? '参加済み' : '参加する'}
    </Button>
  )
}
