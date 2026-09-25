'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { api } from '@/hooks/api'
import { cn } from '@/lib/cn'
import { ASSISTANT_SUGGESTIONS } from '@/prompts/assistant'

type AppliedAction = { ok: boolean; label: string; jobId?: string }
type ChatMessage = { role: 'user' | 'assistant'; content: string; applied?: AppliedAction[] }

/** 目が二つの球体(Copilotのシンボル)。まばたきは globals.css の .orb-eye。 */
function Orb({ size }: { size: number }) {
  const gid = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e6ddff" />
          <stop offset="50%" stopColor="#a685ff" />
          <stop offset="100%" stopColor="#4a32c9" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${gid})`} />
      <ellipse cx="8.5" cy="7" rx="4.2" ry="2.6" fill="rgba(255,255,255,.35)" />
      <ellipse className="orb-eye" cx="8.7" cy="12.6" rx="1.7" ry="2.6" fill="#fff" />
      <ellipse className="orb-eye" cx="15.3" cy="12.6" rx="1.7" ry="2.6" fill="#fff" />
    </svg>
  )
}

/**
 * 全プロジェクト画面に常駐する AI Copilot(要件78〜80)。
 * 相談に加えて、チャットからの変更(価格変更・調査開始など)に対応する。
 * Project Context はサーバー側で注入されるため、ここからは発話だけを送る。
 */
export function AssistantPanel({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const screen = pathname.split('/').pop() === projectId ? 'overview' : (pathname.split('/').pop() ?? 'overview')

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, open, loading])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || loading) return
    setInput('')
    setMessages((previous) => [...previous, { role: 'user', content: message }])
    setLoading(true)
    try {
      const result = await api<{
        conversationId: string
        message: { content: string }
        applied: AppliedAction[]
      }>('/api/assistant', {
        method: 'POST',
        body: { projectId, conversationId, screen, message },
      })
      setConversationId(result.conversationId)
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: result.message.content, applied: result.applied },
      ])
      // チャット経由でデータが変わった場合は表示中の画面へ即反映する
      if (result.applied.some((item) => item.ok)) router.refresh()
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: `エラー: ${error instanceof Error ? error.message : '送信に失敗しました'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = ASSISTANT_SUGGESTIONS[screen] ?? ASSISTANT_SUGGESTIONS.overview ?? []

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'AI Copilotを閉じる' : 'AI Copilotを開く'}
        className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#5636e0] shadow-[0_14px_34px_-10px_rgba(109,74,255,.8)] transition-transform hover:-translate-y-0.5"
      >
        <Orb size={32} />
        <span className="absolute top-1 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#28c840]" />
      </button>

      {open ? (
        <div className="fixed right-5 bottom-22 z-40 flex max-h-[72dvh] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-brand-soft/40 bg-surface shadow-[0_44px_96px_-30px_rgba(23,15,60,.6)]">
          <div className="flex items-center gap-2.5 bg-[linear-gradient(135deg,#1d1631,#2b2350)] px-4 py-3 text-white">
            <Orb size={28} />
            <div className="min-w-0">
              <p className="text-[13px] leading-tight font-black">UCCHAU Copilot</p>
              <p className="text-[10px] leading-tight text-[#b9b0d8]">相談にも、その場の変更にも対応します</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="ml-auto p-1 text-[#b9b0d8] hover:text-white"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="mx-scrollbar flex-1 space-y-2.5 overflow-y-auto bg-canvas px-4 py-4">
            {messages.length === 0 ? (
              <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-[12.5px] leading-relaxed shadow-sm">
                こんにちは!このプロジェクトのデータを見ながら、相談にも変更にも対応します。下の例からもどうぞ。
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={cn('flex flex-col gap-1.5', message.role === 'user' && 'items-end')}>
                  <div
                    className={cn(
                      'max-w-[88%] px-4 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap',
                      message.role === 'user'
                        ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-[#7c5cff] to-[#5636e0] text-white'
                        : 'rounded-2xl rounded-bl-sm border border-line bg-surface shadow-sm',
                    )}
                  >
                    {message.content}
                  </div>
                  {message.applied?.map((item, appliedIndex) => (
                    <span
                      key={appliedIndex}
                      className={cn(
                        'inline-flex max-w-[88%] items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold',
                        item.ok
                          ? 'border-positive/30 bg-positive-wash text-positive'
                          : 'border-critical/30 bg-critical-wash text-critical',
                      )}
                    >
                      {item.ok ? '✓' : '⚠'} {item.label}
                    </span>
                  ))}
                </div>
              ))
            )}
            {loading ? (
              <div className="flex w-16 items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3.5 shadow-sm">
                <span className="cp-dot h-1.5 w-1.5 rounded-full bg-brand-soft" />
                <span className="cp-dot h-1.5 w-1.5 rounded-full bg-brand-soft [animation-delay:.2s]" />
                <span className="cp-dot h-1.5 w-1.5 rounded-full bg-brand-soft [animation-delay:.4s]" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-line bg-canvas px-3 py-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                disabled={loading}
                className="rounded-full border border-line-strong bg-surface px-3 py-1 text-[11px] font-bold text-brand-deep transition-colors hover:border-brand hover:bg-brand-wash disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send(input)
            }}
            className="flex items-center gap-2 border-t border-line bg-surface p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="例: 価格を5,980円に変更して"
              className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-[13px] focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || input.trim() === ''}
              className="h-10 rounded-full bg-gradient-to-br from-[#7c5cff] to-[#5636e0] px-5 text-[12.5px] font-bold text-white disabled:opacity-50"
            >
              送信
            </button>
          </form>
        </div>
      ) : null}
    </>
  )
}
