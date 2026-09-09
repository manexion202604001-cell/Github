'use client'
import { useFormStatus } from 'react-dom'
import { Button, type ButtonProps } from './Button'

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (pendingText ?? '送信中…') : children}
    </Button>
  )
}
