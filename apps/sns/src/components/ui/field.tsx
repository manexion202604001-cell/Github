import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:bg-canvas-alt disabled:text-ink-subtle'

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[13px] font-semibold text-navy">
        {label}
        {required ? <span className="text-danger" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-ink-muted">{hint}</p>
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
    <select ref={ref} className={cn(CONTROL, 'appearance-none bg-[right_0.85rem_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2367748A' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  )
})

/** 複数選択のチップ(オンボーディング・ブランド設定で使う)。 */
export function CheckChip({
  name,
  value,
  label,
  description,
  defaultChecked,
}: {
  name: string
  value: string
  label: string
  description?: string
  defaultChecked?: boolean
}) {
  return (
    <label className="group relative flex cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/40 has-[:checked]:border-brand has-[:checked]:bg-brand-wash">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#135dff]"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-navy">{label}</span>
        {description ? <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{description}</span> : null}
      </span>
    </label>
  )
}

export function RadioChip({
  name,
  value,
  label,
  description,
  defaultChecked,
}: {
  name: string
  value: string
  label: string
  description?: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/40 has-[:checked]:border-brand has-[:checked]:bg-brand-wash">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#135dff]"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-navy">{label}</span>
        {description ? <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{description}</span> : null}
      </span>
    </label>
  )
}
