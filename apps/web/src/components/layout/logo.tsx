import Image from 'next/image'
import { cn } from '@/lib/cn'

/**
 * UCCHAU ブランドロゴ。
 * 明るいラベンダー背景ではフルロックアップ画像(紺文字)がそのまま読めるため
 * 画像をそのまま使用する。元データは public/logo-original.png に保持。
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt="UCCHAU"
      width={512}
      height={512}
      priority
      className={cn('h-8 w-auto', className)}
    />
  )
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  if (compact) return <LogoMark className={className} />
  return (
    <Image
      src="/logo-full.png"
      alt="UCCHAU"
      width={1200}
      height={276}
      priority
      className={cn('h-8 w-auto', className)}
    />
  )
}
