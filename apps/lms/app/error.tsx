'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/Button'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-serif text-[18px]">エラーが発生しました。</p>
      <p className="caption">時間をおいて再度お試しください。</p>
      <Button variant="ghost" onClick={() => reset()}>もう一度読み込む</Button>
    </div>
  )
}
