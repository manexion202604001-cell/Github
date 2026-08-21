'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/hooks/api'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { ASSISTANT_SUGGESTIONS } from '@/prompts/assistant'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

/**
 * 全プロジェクト画面に常駐する AI Assistant(要件78)。
 * Project Context はサーバー側で注入されるため、ここからは質問文だけを送る。
 */
export function AssistantPanel({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const screen = pathname.split('/').pop() === projectId ? 'overview' : (pathname.split('/').pop() ?? 'overview')

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, open])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || loading) return
    setInput('')
    setMessages((previous) => [...previous, { role: 'user', content: message }])
    setLoading(true)
    try {
      const result = await api<{ conversationId: string; message: { content: string } }>('/api/assistant', {
        method: 'POST',
        body: { projectId, conversationId, screen, message },
      })
      setConversationId(result.conversationId)
      setMessages((previous) => [...previous, { role: 'assistant', content: result.message.content }])
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
        className={cn(
          'fixed right-5 bottom-5 z-40 flex h-13 items-center gap-2 px-5 font-bold text-white shadow-lg transition-colors',
          open ? 'bg-ink' : 'bg-brand hover:bg-brand-soft',
        )}
        style={{ height: 52 }}
      >
        {open ? '閉じる' : 'AI Assistant'}
      </button>

      {open ? (
        <div className="fixed right-5 bottom-20 z-40 flex max-h-[70dvh] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden border border-line bg-surface shadow-xl">
          <div className="border-b border-line px-5 py-3.5">
            <p className="text-[14px] font-bold">AI Assistant</p>
            <p className="text-[12px] text-ink-subtle">このプロジェクトのデータを踏まえて回答します</p>
          </div>

          <div ref={scrollRef} className="mx-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-ink-subtle">質問の例</p>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="block w-full border border-line bg-canvas px-3.5 py-2.5 text-left text-[13px] text-ink-muted transition-colors hover:border-brand hover:text-brand"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap',
                    message.role === 'user' ? 'ml-auto bg-brand text-white' : 'bg-canvas-alt text-ink',
                  )}
                >
                  {message.content}
                </div>
              ))
            )}
            {loading ? <div className="w-14 bg-canvas-alt px-4 py-2.5 text-[13px]">…</div> : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send(input)
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="この商品売れそう?"
              className="h-10 flex-1 border border-line bg-surface px-3.5 text-[13px] focus:border-brand focus:outline-none"
            />
            <Button type="submit" size="md" disabled={loading || input.trim() === ''}>
              送信
            </Button>
          </form>
        </div>
      ) : null}
    </>
  )
}
