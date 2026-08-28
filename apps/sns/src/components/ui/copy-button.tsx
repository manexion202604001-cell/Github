'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'

/** クリップボードコピー(要件39, 102)。 */
export function CopyButton({
  value,
  label = 'コピー',
  className,
  size = 'sm',
}: {
  value: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setFailed(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボードAPIが使えない環境(非HTTPS等)では手動コピーを促す。
      setFailed(true)
      setTimeout(() => setFailed(false), 3000)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-surface font-semibold text-navy transition-colors hover:border-brand/40 hover:bg-brand-wash hover:text-brand',
        size === 'sm' ? 'h-8 px-2.5 text-[12px]' : 'h-10 px-3.5 text-[13px]',
        className,
      )}
      aria-live="polite"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-positive" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {failed ? '手動でコピーしてください' : copied ? 'コピーしました' : label}
    </button>
  )
}
