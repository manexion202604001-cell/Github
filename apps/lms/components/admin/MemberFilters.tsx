'use client'
import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs'
import { Input, Select } from '@/components/ui/Input'
import { ROLE_LABEL } from '@/lib/utils'

/** ADM-04: 会員検索（表示名 / メール）・ロール・退会申請フィルタ */
export function MemberFilters() {
  const [q, setQ] = useQueryStates(
    { q: parseAsString.withDefault(''), role: parseAsString.withDefault(''), pending: parseAsBoolean.withDefault(false), page: parseAsString.withDefault('') },
    { shallow: false },
  )
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setQ({ q: String(fd.get('q') ?? '') || null, page: null })
      }}
    >
      <Input name="q" defaultValue={q.q} placeholder="表示名・メールアドレスで検索" aria-label="検索" className="h-9 text-[13px]" />
      <Select aria-label="ロール" value={q.role} onChange={(e) => setQ({ role: e.target.value || null, page: null })} className="h-9 text-[13px]">
        <option value="">すべてのロール</option>
        {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </Select>
      <label className="flex h-9 items-center gap-2 font-sans text-[13px] text-ink-700">
        <input type="checkbox" checked={q.pending} onChange={(e) => setQ({ pending: e.target.checked || null, page: null })} className="accent-bronze-500" />
        退会申請中のみ
      </label>
    </form>
  )
}
