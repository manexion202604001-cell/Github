'use client'
import { useEffect, useState } from 'react'
import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs'
import { Input, Select } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'

/** QA-06: 検索・絞り込み（URL state） */
export function QaFilters({ courses }: { courses: { id: string; title: string }[] }) {
  const [q, setQ] = useQueryStates(
    {
      q: parseAsString.withDefault(''),
      course: parseAsString.withDefault(''),
      status: parseAsString.withDefault(''),
      mine: parseAsBoolean.withDefault(false),
    },
    { shallow: false },
  )
  const [text, setText] = useState(q.q)
  useEffect(() => setText(q.q), [q.q])

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
      onSubmit={(e) => {
        e.preventDefault()
        setQ({ q: text.trim() || null })
      }}
    >
      <Input
        type="search"
        aria-label="検索"
        placeholder="タイトル・本文を検索"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() !== q.q && setQ({ q: text.trim() || null })}
        className="h-9 text-[13px]"
      />
      <Select aria-label="コース" value={q.course} onChange={(e) => setQ({ course: e.target.value || null })} className="h-9 text-[13px] sm:w-48">
        <option value="">すべてのコース</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </Select>
      <Select aria-label="ステータス" value={q.status} onChange={(e) => setQ({ status: e.target.value || null })} className="h-9 text-[13px] sm:w-36">
        <option value="">すべて</option>
        <option value="open">未回答</option>
        <option value="answered">回答済</option>
        <option value="resolved">解決済</option>
      </Select>
      <div className="flex h-9 items-center gap-2">
        <Checkbox id="qa-mine" checked={q.mine} onCheckedChange={(v) => setQ({ mine: v === true ? true : null })} />
        <Label htmlFor="qa-mine" className="mb-0 cursor-pointer whitespace-nowrap">自分の質問</Label>
      </div>
    </form>
  )
}
