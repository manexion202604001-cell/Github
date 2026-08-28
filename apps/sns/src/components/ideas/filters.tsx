'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Star } from 'lucide-react'
import { ACTIVE_CHANNELS } from '@/lib/config/channels'
import { IDEA_CATEGORIES } from '@/lib/config/taxonomy'
import { cn } from '@/lib/cn'

/** 企画一覧の絞り込み。状態はURLに持たせ、共有・リロードに耐える。 */
export function IdeaFilters({ total }: { total: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const favorite = searchParams.get('favorite') === '1'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-[13px] font-semibold text-navy">
        <span className="tabular">{total}</span> 件の企画
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => update('favorite', favorite ? null : '1')}
          aria-pressed={favorite}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-semibold transition-colors',
            favorite ? 'border-accent bg-accent/20 text-[#7a5a00]' : 'border-line bg-surface text-ink-muted hover:text-navy',
          )}
        >
          <Star className={cn('h-3.5 w-3.5', favorite && 'fill-current')} aria-hidden="true" />
          お気に入り
        </button>

        <label className="sr-only" htmlFor="filter-channel">
          SNSで絞り込む
        </label>
        <select
          id="filter-channel"
          value={searchParams.get('channel') ?? ''}
          onChange={(event) => update('channel', event.target.value || null)}
          className="h-9 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-semibold text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        >
          <option value="">すべてのSNS</option>
          {ACTIVE_CHANNELS.map((channel) => (
            <option key={channel.key} value={channel.key}>
              {channel.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-category">
          カテゴリーで絞り込む
        </label>
        <select
          id="filter-category"
          value={searchParams.get('category') ?? ''}
          onChange={(event) => update('category', event.target.value || null)}
          className="h-9 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-semibold text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        >
          <option value="">すべてのカテゴリー</option>
          {IDEA_CATEGORIES.map((category) => (
            <option key={category.key} value={category.key}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
