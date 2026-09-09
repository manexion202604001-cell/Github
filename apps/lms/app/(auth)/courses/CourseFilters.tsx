'use client'
import { parseAsString, useQueryStates } from 'nuqs'
import { Select } from '@/components/ui/Input'
import { LEVEL_LABEL } from '@/lib/utils'

export function CourseFilters({ categories }: { categories: { slug: string; name: string }[] }) {
  const [q, setQ] = useQueryStates(
    { category: parseAsString.withDefault(''), level: parseAsString.withDefault(''), state: parseAsString.withDefault(''), sort: parseAsString.withDefault('') },
    { shallow: false },
  )
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Select aria-label="カテゴリ" value={q.category} onChange={(e) => setQ({ category: e.target.value || null })} className="h-9 text-[13px]">
        <option value="">すべてのカテゴリ</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>{c.name}</option>
        ))}
      </Select>
      <Select aria-label="難易度" value={q.level} onChange={(e) => setQ({ level: e.target.value || null })} className="h-9 text-[13px]">
        <option value="">すべての難易度</option>
        {(Object.keys(LEVEL_LABEL) as (keyof typeof LEVEL_LABEL)[]).map((k) => (
          <option key={k} value={k}>{LEVEL_LABEL[k]}</option>
        ))}
      </Select>
      <Select aria-label="状態" value={q.state} onChange={(e) => setQ({ state: e.target.value || null })} className="h-9 text-[13px]">
        <option value="">すべての状態</option>
        <option value="in_progress">受講中</option>
        <option value="not_started">未着手</option>
        <option value="completed">完了</option>
      </Select>
      <Select aria-label="並び順" value={q.sort} onChange={(e) => setQ({ sort: e.target.value || null })} className="h-9 text-[13px]">
        <option value="">おすすめ順</option>
        <option value="state">受講中 → 未着手 → 完了</option>
      </Select>
    </div>
  )
}
