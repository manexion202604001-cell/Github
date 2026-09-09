'use client'
import { useEffect, useState } from 'react'

type Toast = { id: number; message: string }
const listeners = new Set<(t: Toast) => void>()
let seq = 0

/** 画面下中央のトースト（3 秒で消える。音・バイブなし） */
export function toast(message: string) {
  const t = { id: ++seq, message }
  listeners.forEach((l) => l(t))
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    const l = (t: Toast) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3000)
    }
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-fade-up rounded border-l border-bronze-500 bg-ink-800 px-5 py-3 font-sans text-[13px] tracking-[0.04em] text-paper-100"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
