'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, RefreshCw, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/Toaster'
import { resendInvitation, revokeInvitation } from '@/lib/actions/admin/members'
import { formatDate, ROLE_LABEL } from '@/lib/utils'

type Row = {
  id: string
  email: string
  token: string
  role: 'student' | 'instructor' | 'admin'
  expiresAt: Date
  usedAt: Date | null
  inviterName: string | null
  status: 'pending' | 'expired' | 'used'
}

const STATUS_LABEL = { pending: '未使用', expired: '期限切れ', used: '使用済み' } as const

/** ADM-04: 招待一覧（URL コピー・再送・取消） */
export function InvitationList({ rows, appBase }: { rows: Row[]; appBase: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  if (rows.length === 0) return <p className="caption">招待はまだありません。</p>

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${appBase}/signup?token=${token}`)
      toast('招待 URL をコピーしました。')
    } catch {
      toast('コピーに失敗しました。')
    }
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>メール</Th>
          <Th>ロール</Th>
          <Th>状態</Th>
          <Th>有効期限</Th>
          <Th>招待者</Th>
          <Th className="text-right">操作</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="font-mono">{r.email}</Td>
            <Td>{ROLE_LABEL[r.role]}</Td>
            <Td>
              <Badge variant={r.status === 'pending' ? 'status' : 'muted'}>{STATUS_LABEL[r.status]}</Badge>
            </Td>
            <Td className="tnum whitespace-nowrap">{formatDate(r.expiresAt)}</Td>
            <Td>{r.inviterName ?? '—'}</Td>
            <Td>
              <div className="flex justify-end gap-1">
                {r.status === 'pending' && (
                  <Button type="button" variant="ghost" size="icon" aria-label="招待 URL をコピー" onClick={() => copy(r.token)}>
                    <Copy />
                  </Button>
                )}
                {r.status !== 'used' && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="再送"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await resendInvitation(r.id)
                          toast(res.ok ? '再送しました。' : res.error)
                          router.refresh()
                        })
                      }
                    >
                      <RefreshCw />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="取消"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await revokeInvitation(r.id)
                          toast(res.ok ? '取り消しました。' : res.error)
                          router.refresh()
                        })
                      }
                    >
                      <X />
                    </Button>
                  </>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
