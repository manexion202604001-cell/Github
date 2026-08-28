'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ACTIVE_CHANNELS } from '@/lib/config/channels'

const TYPES = [
  { key: 'all', label: 'すべて' },
  { key: 'research', label: '調査' },
  { key: 'idea', label: '企画' },
  { key: 'script', label: '台本' },
  { key: 'prompt', label: 'プロンプト' },
]

const CONTROL =
  'h-10 rounded-[12px] border border-line bg-surface px-3 text-[13px] font-semibold text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'

/** 横断検索の条件(要件44)。条件はURLに保持する。 */
export function LibraryFilters({ brands }: { brands: { id: string; name: string }[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')

  function apply(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            apply({ q: keyword.trim() || null })
          }}
          className="flex flex-wrap gap-2"
          role="search"
        >
          <div className="relative min-w-[12rem] flex-1">
            <label htmlFor="library-keyword" className="sr-only">
              キーワード
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              id="library-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="キーワードで検索"
              className={`${CONTROL} w-full pl-9 font-normal`}
            />
          </div>
          <Button type="submit">検索</Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <label htmlFor="library-brand" className="sr-only">
            ブランド
          </label>
          <select
            id="library-brand"
            value={searchParams.get('brandId') ?? ''}
            onChange={(event) => apply({ brandId: event.target.value || null })}
            className={CONTROL}
          >
            <option value="">すべてのブランド</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <label htmlFor="library-type" className="sr-only">
            種別
          </label>
          <select
            id="library-type"
            value={searchParams.get('type') ?? 'all'}
            onChange={(event) => apply({ type: event.target.value === 'all' ? null : event.target.value })}
            className={CONTROL}
          >
            {TYPES.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>

          <label htmlFor="library-channel" className="sr-only">
            SNS
          </label>
          <select
            id="library-channel"
            value={searchParams.get('channel') ?? ''}
            onChange={(event) => apply({ channel: event.target.value || null })}
            className={CONTROL}
          >
            <option value="">すべてのSNS</option>
            {ACTIVE_CHANNELS.map((channel) => (
              <option key={channel.key} value={channel.key}>
                {channel.label}
              </option>
            ))}
          </select>

          <label htmlFor="library-from" className="sr-only">
            開始日
          </label>
          <input
            id="library-from"
            type="date"
            value={searchParams.get('from') ?? ''}
            onChange={(event) => apply({ from: event.target.value || null })}
            className={CONTROL}
          />

          <label htmlFor="library-to" className="sr-only">
            終了日
          </label>
          <input
            id="library-to"
            type="date"
            value={searchParams.get('to') ?? ''}
            onChange={(event) => apply({ to: event.target.value || null })}
            className={CONTROL}
          />

          <Button
            variant="ghost"
            onClick={() => {
              setKeyword('')
              router.push(pathname)
            }}
          >
            条件をクリア
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
