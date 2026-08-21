'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/hooks/api'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Notice } from '@/components/ui/feedback'
import { formatDate } from '@/lib/format'

type Member = { id: string; role: string; name: string | null; email: string }
type Invite = { email: string; role: string; expiresAt: string }

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

export function MembersPanel({
  initialMembers,
  initialInvites,
  myRole,
}: {
  initialMembers: Member[]
  initialInvites: Invite[]
  myRole: string
}) {
  const router = useRouter()
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN'
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EDITOR')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const invite = async () => {
    if (!email.trim()) return
    setBusy(true)
    setError(null)
    setSent(false)
    try {
      await api('/api/organizations/members', { method: 'POST', body: { email: email.trim(), role } })
      setEmail('')
      setSent(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const changeRole = async (memberId: string, nextRole: string) => {
    setError(null)
    try {
      await api('/api/organizations/members', { method: 'PATCH', body: { memberId, role: nextRole } })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '権限の変更に失敗しました')
      router.refresh()
    }
  }

  const remove = async (memberId: string) => {
    setError(null)
    try {
      await api(`/api/organizations/members?memberId=${encodeURIComponent(memberId)}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  return (
    <Card>
      <CardHeader
        title="メンバー"
        description="組織に所属するユーザーと権限を管理します。招待はメールで送信されます。"
      />
      <CardBody className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {sent ? <Notice tone="success">招待メールを送信しました。</Notice> : null}

        {canManage ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <Field label="メールアドレス">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="member@example.com"
              />
            </Field>
            <Field label="権限">
              <Select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button onClick={invite} loading={busy}>
                招待する
              </Button>
            </div>
          </div>
        ) : null}

        <div className="divide-y divide-line border border-line">
          {initialMembers.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold">{member.name ?? member.email}</p>
                <p className="text-[12px] text-ink-subtle">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <>
                    <Select
                      value={member.role}
                      onChange={(event) => void changeRole(member.id, event.target.value)}
                      className="h-8 w-28 py-0 text-[12px]"
                    >
                      {Object.entries(ROLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => void remove(member.id)}>
                      削除
                    </Button>
                  </>
                ) : (
                  <Badge tone={member.role === 'OWNER' ? 'brand' : 'neutral'}>{ROLE_LABEL[member.role]}</Badge>
                )}
              </div>
            </div>
          ))}
          {initialInvites.map((invite) => (
            <div key={invite.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[14px] font-semibold text-ink-muted">{invite.email}</p>
                <p className="text-[12px] text-ink-subtle">
                  招待中({ROLE_LABEL[invite.role] ?? invite.role})— {formatDate(invite.expiresAt)} まで有効
                </p>
              </div>
              <Badge tone="caution">承認待ち</Badge>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
