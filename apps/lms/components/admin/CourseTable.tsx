'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/Toaster'
import { reorderCourses } from '@/lib/actions/admin/courses'
import { formatDate, LEVEL_LABEL } from '@/lib/utils'

export const COURSE_STATUS_LABEL = { draft: '下書き', published: '公開中', archived: 'アーカイブ' } as const

type Row = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  level: 'beginner' | 'intermediate' | 'advanced'
  categoryName: string | null
  lessonCount: number
  publishedAt: Date | null
  updatedAt: Date
}

/** ADM-01: コース一覧（並び替え上下ボタン付き） */
export function CourseTable({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [pending, start] = useTransition()

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= rows.length) return
    const next = [...rows]
    const [r] = next.splice(index, 1)
    if (!r) return
    next.splice(to, 0, r)
    setRows(next)
    start(async () => {
      const res = await reorderCourses(next.map((x) => x.id))
      if (!res.ok) {
        toast(res.error)
        setRows(rows)
      } else router.refresh()
    })
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-16">順序</Th>
          <Th>タイトル</Th>
          <Th>ステータス</Th>
          <Th>カテゴリ</Th>
          <Th>難易度</Th>
          <Th className="text-right">レッスン</Th>
          <Th>公開日</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c, i) => (
          <tr key={c.id}>
            <Td>
              <div className="flex">
                <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="上へ" disabled={pending || i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="下へ" disabled={pending || i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown />
                </Button>
              </div>
            </Td>
            <Td>
              <Link href={`/admin/courses/${c.id}`} className="font-serif text-[15px] no-underline hover:text-bronze-500">{c.title}</Link>
              <p className="caption font-mono">{c.slug}</p>
            </Td>
            <Td>
              <Badge variant={c.status === 'published' ? 'status' : c.status === 'archived' ? 'muted' : 'tag'}>{COURSE_STATUS_LABEL[c.status]}</Badge>
            </Td>
            <Td>{c.categoryName ?? '—'}</Td>
            <Td>{LEVEL_LABEL[c.level]}</Td>
            <Td className="tnum text-right">{Number(c.lessonCount)}</Td>
            <Td className="tnum whitespace-nowrap">{c.publishedAt ? formatDate(c.publishedAt) : '—'}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
