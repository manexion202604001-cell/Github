'use client'

import { useRouter } from 'next/navigation'
import { api } from '@/hooks/api'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void api('/api/auth/logout', { method: 'POST' }).then(() => {
          router.push('/login')
          router.refresh()
        })
      }}
    >
      ログアウト
    </Button>
  )
}
