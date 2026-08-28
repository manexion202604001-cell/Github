'use client'

import { Printer } from 'lucide-react'

/** 印刷(要件102)。印刷用CSSで操作系を落とす。 */
export function PrintButton({ label = '印刷' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-canvas-alt"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}
