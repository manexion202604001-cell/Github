import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { listInvitations, listMembers } from '@/lib/db/queries/members'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, Td, Th } from '@/components/ui/Table'
import { MemberFilters } from '@/components/admin/MemberFilters'
import { DeletionActions, RoleSelect } from '@/components/admin/MemberActions'
import { InviteForm } from '@/components/admin/InviteForm'
import { InvitationList } from '@/components/admin/InvitationList'
import { appUrl, formatDate } from '@/lib/utils'

export const metadata = { title: '会員' }

type Search = { q?: string; role?: string; pending?: string; page?: string }

/** ADM-04: 会員管理（admin のみ） */
export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireRole('admin')
  const sp = await searchParams
  const role = sp.role === 'student' || sp.role === 'instructor' || sp.role === 'admin' ? sp.role : null
  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const [members, invitations] = await Promise.all([
    listMembers({ q: sp.q ?? null, role, pendingOnly: sp.pending === 'true', page }),
    listInvitations(),
  ])
  const pages = Math.max(1, Math.ceil(members.total / members.perPage))
  const qs = (p: number) => {
    const u = new URLSearchParams()
    if (sp.q) u.set('q', sp.q)
    if (role) u.set('role', role)
    if (sp.pending === 'true') u.set('pending', 'true')
    u.set('page', String(p))
    return `/admin/members?${u.toString()}`
  }

  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Members" title="会員" description={`${members.total} 人`} />

      <section className="space-y-4">
        <MemberFilters />
        {members.rows.length === 0 ? (
          <p className="py-8 text-center font-serif text-ink-700">該当する会員はいません。</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>表示名</Th>
                <Th>メール</Th>
                <Th>ロール</Th>
                <Th className="text-right">XP</Th>
                <Th>最終ログイン</Th>
                <Th>退会申請</Th>
              </tr>
            </thead>
            <tbody>
              {members.rows.map((m) => (
                <tr key={m.id}>
                  <Td>
                    <Link href={`/admin/members/${m.id}`} className="font-serif text-[15px] no-underline hover:text-bronze-500">{m.displayName}</Link>
                  </Td>
                  <Td className="font-mono">{m.email ?? '—'}</Td>
                  <Td>
                    <RoleSelect userId={m.id} role={m.role} isSelf={m.id === me.id} />
                  </Td>
                  <Td className="tnum text-right">{m.totalXp.toLocaleString('ja-JP')}</Td>
                  <Td className="tnum whitespace-nowrap">{m.lastLoginAt ? formatDate(m.lastLoginAt) : '—'}</Td>
                  <Td>
                    {m.deletionRequestedAt ? (
                      <div className="flex flex-col gap-2">
                        <Badge variant="status" className="w-fit">申請中 {formatDate(m.deletionRequestedAt)}</Badge>
                        <DeletionActions userId={m.id} displayName={m.displayName} />
                      </div>
                    ) : (
                      '—'
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <nav aria-label="ページ" className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={qs(Math.max(1, page - 1))} aria-disabled={page <= 1}>前へ</Link>
            </Button>
            <span className="caption tnum">{page} / {pages}</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href={qs(Math.min(pages, page + 1))} aria-disabled={page >= pages}>次へ</Link>
            </Button>
          </nav>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-[20px]">招待</h2>
        <div className="max-w-prose">
          <InviteForm />
        </div>
        <InvitationList rows={invitations} appBase={appUrl()} />
      </section>
    </div>
  )
}
