'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Sparkles, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastTone = 'success' | 'error' | 'warning' | 'info' | 'ai'

type Toast = { id: number; tone: ToastTone; title: string; description?: string }

type ToastContextValue = {
  notify: (toast: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  ai: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-positive' },
  error: { icon: XCircle, className: 'text-danger' },
  warning: { icon: AlertTriangle, className: 'text-[#9a6511]' },
  info: { icon: Info, className: 'text-brand' },
  ai: { icon: Sparkles, className: 'text-insight' },
}

const AUTO_DISMISS_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-3), { ...toast, id }])
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, description) => notify({ tone: 'success', title, ...(description ? { description } : {}) }),
      error: (title, description) => notify({ tone: 'error', title, ...(description ? { description } : {}) }),
      ai: (title, description) => notify({ tone: 'ai', title, ...(description ? { description } : {}) }),
    }),
    [notify],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        role="region"
        aria-label="通知"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { icon: Icon, className } = TONES[toast.tone]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 shadow-[0_16px_44px_rgba(15,39,80,0.14)]"
    >
      <Icon className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', className)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-navy">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="rounded-md p-1 text-ink-subtle transition-colors hover:bg-canvas-alt hover:text-ink"
        aria-label="通知を閉じる"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast は ToastProvider の内側で使ってください')
  return context
}
