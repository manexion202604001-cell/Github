import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'gradient' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong shadow-[0_6px_18px_rgba(19,93,255,0.22)]',
  gradient: 'gradient-brand text-white hover:brightness-105 shadow-[0_10px_28px_rgba(19,93,255,0.28)]',
  secondary: 'bg-surface text-navy border border-line hover:border-line-strong hover:bg-canvas-alt',
  ghost: 'bg-transparent text-ink-muted hover:bg-brand-wash hover:text-brand',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[12px]',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-[14px]',
}

/** Button と見た目を揃えたリンク。遷移は <a> に任せる(要件92)。 */
export function LinkButton({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-[background-color,color,border-color,filter] duration-200',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
