'use client'

import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * キーワード・強み等の複数入力。
 * hidden input に改行区切りで詰めるため、Server Action 側は toStringList で受け取れる。
 */
export function TagInput({
  name,
  defaultValue = [],
  placeholder = '入力して Enter',
  max = 20,
  className,
}: {
  name: string
  defaultValue?: string[]
  placeholder?: string
  max?: number
  className?: string
}) {
  const [tags, setTags] = useState<string[]>(defaultValue)
  const [draft, setDraft] = useState('')

  function add(raw: string) {
    const value = raw.trim()
    if (!value || tags.includes(value) || tags.length >= max) return
    setTags([...tags, value])
    setDraft('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  return (
    <div className={cn('rounded-[12px] border border-line bg-surface px-2.5 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15', className)}>
      <input type="hidden" name={name} value={tags.join('\n')} />
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2.5 py-1 text-[12px] font-semibold text-brand">
            {tag}
            <button
              type="button"
              onClick={() => setTags(tags.filter((item) => item !== tag))}
              className="rounded-full p-0.5 transition-colors hover:bg-brand/15"
              aria-label={`${tag} を削除`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={tags.length >= max ? `最大${max}件です` : placeholder}
          disabled={tags.length >= max}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-ink-subtle"
          aria-label={placeholder}
        />
        {draft.trim() ? (
          <button
            type="button"
            onClick={() => add(draft)}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand"
          >
            <Plus className="h-3 w-3" /> 追加
          </button>
        ) : null}
      </div>
    </div>
  )
}
