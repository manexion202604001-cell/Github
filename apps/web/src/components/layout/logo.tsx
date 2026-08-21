import Image from 'next/image'
import { cn } from '@/lib/cn'

/**
 * UCCHAU ブランドロゴ。
 * ダークテーマではフルロックアップ画像(紺文字)が沈むため、
 * アイコン画像 + テキストで構成し、文字色はテーマトークンに追従させる。
 * 元データは public/logo-original.png、フル画像は public/logo-full.png に保持。
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
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="h-8" />
      <span className="text-[18px] font-black tracking-tight text-ink">UCCHAU</span>
    </span>
  )
}
