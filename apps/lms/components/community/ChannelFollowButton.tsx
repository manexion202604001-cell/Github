'use client'
import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleChannelFollow } from '@/lib/actions/community'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

/** COM-08: チャンネルのフォロー切替 */
export function ChannelFollowButton({ channelId, followed }: { channelId: string; followed: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [state, setOptimistic] = useOptimistic(followed)
  return (
    <Button
      variant={state ? 'outline' : 'primary'}
      size="sm"
      disabled={pending}
      aria-pressed={state}
      onClick={() =>
        start(async () => {
          setOptimistic(!state)
          const r = await toggleChannelFollow(channelId)
          if (!r.ok) return toast(r.error)
          toast(r.data.followed ? 'フォローしました。' : 'フォローを解除しました。')
          router.refresh()
        })
      }
    >
      {state ? 'フォロー中' : 'フォローする'}
    </Button>
  )
}
