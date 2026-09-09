import Link from 'next/link'
import { Download } from 'lucide-react'
import { hasRole, requireRole } from '@/lib/auth'
import { getProgressMatrix } from '@/lib/db/queries/members'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatDate } from '@/lib/utils'

export const metadata = { title: '受講状況' }

/** ADM-05: 会員 × コースの進捗表 */
export default async function AdminProgressPage() {
  const user = await requireRole('instructor')
  const isAdmin = hasRole(user.profile, 'admin')
  const m = await getProgressMatrix()
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Progress"
        title="受講状況"
        description="公開中のコースについて、会員ごとの進捗率（完了レッスン / 全レッスン）を表示します。"
        actions={
          isAdmin ? (
            <Button variant="outline" size="sm" asChild>
              <a href="/api/admin/progress-csv">
                <Download /> CSV エクスポート
              </a>
            </Button>
          ) : undefined
        }
      />
      {m.members.length === 0 || m.courses.length === 0 ? (
        <EmptyState message="表示できる受講状況はまだありません。" action={{ label: 'コースを管理', href: '/admin/courses' }} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="sticky left-0 bg-paper-100">会員</Th>
              <Th>最終ログイン</Th>
              {m.courses.map((c) => (
                <Th key={c.id} className="min-w-[120px] normal-case tracking-wide">{c.title}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.members.map((mem) => (
              <tr key={mem.id}>
                <Td className="sticky left-0 bg-paper-100 whitespace-nowrap">
                  {isAdmin ? (
                    <Link href={`/admin/members/${mem.id}`} className="no-underline hover:text-bronze-500">{mem.displayName}</Link>
                  ) : (
                    mem.displayName
                  )}
                </Td>
                <Td className="tnum whitespace-nowrap">{mem.lastLoginAt ? formatDate(mem.lastLoginAt) : '—'}</Td>
                {m.courses.map((c) => {
                  const p = mem.progress[c.id]
                  return (
                    <Td key={c.id} className="tnum">
                      {p && (p.completed > 0 || p.completedAt) ? (
                        <span className={p.completedAt ? 'text-bronze-500' : undefined}>{p.progress}%</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </Td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
