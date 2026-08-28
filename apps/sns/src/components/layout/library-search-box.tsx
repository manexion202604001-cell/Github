'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

/** ヘッダーの横断検索(要件77)。入力はライブラリの検索へ渡す。 */
export function LibrarySearchBox() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const query = keyword.trim()
        router.push(query ? `/library?q=${encodeURIComponent(query)}` : '/library')
      }}
      role="search"
      className="relative max-w-md"
    >
      <label htmlFor="global-search" className="sr-only">
        調査・企画・台本を検索
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
      <input
        id="global-search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="調査・企画・台本を検索"
        className="h-9 w-full rounded-[12px] border border-line bg-canvas pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/15"
      />
    </form>
  )
}
