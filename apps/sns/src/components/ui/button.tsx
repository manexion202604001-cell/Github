import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'gradient' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong shadow-[0_6px_18px_rgba(19,93,255,0.22)]',
  // Hero・主要CTAのみ(要件72)。
  gradient: 'gradient-brand text-white hover:brightness-105 shadow-[0_10px_28px_rgba(19,93,255,0.28)]',
  secondary: 'bg-surface text-navy border border-line hover:border-line-strong hover:bg-canvas-alt',
  ghost: 'bg-transparent text-ink-muted hover:bg-brand-wash hover:text-brand',
  danger: 'bg-danger-wash text-danger border border-danger/20 hover:bg-danger hover:text-white',
  // 重要箇所だけに使うYellow(要件71)。
  accent: 'bg-accent text-navy hover:brightness-95 shadow-[0_6px_18px_rgba(255,215,96,0.35)]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[12px]',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-[14px]',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-[background-color,color,border-color,filter,box-shadow] duration-200',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
})
