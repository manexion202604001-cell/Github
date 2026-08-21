'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/hooks/api'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/feedback'

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      await api('/api/invitations', { method: 'POST', body: { token } })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button onClick={accept} loading={busy} size="lg" className="w-full">
        参加する
      </Button>
    </div>
  )
}
