'use client'

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition-colors hover:border-line-strong focus:border-brand focus:outline-none disabled:bg-canvas-alt disabled:text-ink-subtle'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label className="block text-[13px] font-semibold text-ink">
          {label}
          {required ? <span className="ml-1 text-brand">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12px] text-critical">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-relaxed text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(CONTROL, className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(CONTROL, 'resize-y leading-relaxed', className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(CONTROL, 'appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  )
})

/** 値をリアルタイムに反映するスライダー(要件41)。 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  className,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
        </label>
        <span className="tabular text-[13px] font-bold text-brand">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none bg-line accent-brand"
      />
    </div>
  )
}
