import * as React from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'flex h-11 w-full rounded border bg-paper-100 px-3 font-sans text-[14px] text-ink-700 tracking-[0.04em] transition-colors placeholder:text-stone-400 focus:border-bronze-500 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-40'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />,
)
Input.displayName = 'Input'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputClass, 'h-auto min-h-[120px] py-3 leading-[1.8]', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(inputClass, 'appearance-none pr-8', className)} {...props} />
  ),
)
Select.displayName = 'Select'

export { Input, Textarea, Select }
