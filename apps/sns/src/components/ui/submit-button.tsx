'use client'

import { useFormStatus } from 'react-dom'
import type { ComponentProps } from 'react'
import { Button } from './button'

/**
 * Server Action 用の送信ボタン。
 * 送信中は自動で disabled になり、連打を防ぐ(要件98)。
 */
export function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  )
}
