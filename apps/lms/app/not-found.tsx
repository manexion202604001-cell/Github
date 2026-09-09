import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="eyebrow">404</p>
      <p className="font-serif text-[18px]">ページが見つかりません。</p>
      <Button variant="ghost" asChild>
        <Link href="/dashboard">ダッシュボードへ</Link>
      </Button>
    </div>
  )
}
