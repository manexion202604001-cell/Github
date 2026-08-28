'use client'

import { useActionState, useEffect } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { changeMemberRoleAction, inviteMemberAction, removeMemberAction } from '@/features/organizations/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { ROLE_DESCRIPTIONS, ROLE_LABELS, roleAtLeast, type Role } from '@/features/organizations/domain'
import type { ActionResult } from '@/lib/errors'

type Member = { id: string; userId: string; name: string; email: string; role: Role; joined: boolean }

const ASSIGNABLE: Role[] = ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER']

/** メンバー管理(要件9)。自分より上位の権限は付与・変更できない。 */
export function TeamPanel({ members, viewerRole, viewerId }: { members: Member[]; viewerRole: Role; viewerId: string }) {
  const toast = useToast()
  const [inviteState, inviteAction] = useActionState<ActionResult | null, FormData>(inviteMemberAction, null)
  const [roleState, roleAction] = useActionState<ActionResult | null, FormData>(changeMemberRoleAction, null)
  const [removeState, removeAction] = useActionState<ActionResult | null, FormData>(removeMemberAction, null)
  const canManage = roleAtLeast(viewerRole, 'ADMIN')

  useEffect(() => {
    if (inviteState?.ok) toast.success('メンバーを追加しました。')
  }, [inviteState, toast])
  useEffect(() => {
    if (roleState?.ok) toast.success('権限を変更しました。')
    if (roleState && !roleState.ok) toast.error(roleState.message, roleState.hint ?? undefined)
  }, [roleState, toast])
  useEffect(() => {
    if (removeState?.ok) toast.success('メンバーを削除しました。')
    if (removeState && !removeState.ok) toast.error(removeState.message, removeState.hint ?? undefined)
  }, [removeState, toast])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={<Users className="h-4 w-4" />} title="メンバー" description="権限ごとにできる操作が変わります。" />
        <CardBody>
          <ul className="space-y-2">
            {members.map((member) => {
              const isSelf = member.userId === viewerId
              const editable = canManage && !isSelf && roleAtLeast(viewerRole, member.role)
              return (
                <li key={member.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-navy">
                      {member.name || member.email}
                      {isSelf ? <span className="ml-2 text-[11px] font-semibold text-brand">あなた</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-ink-muted">{member.email}</p>
                  </div>

                  {!member.joined ? <Badge tone="warning">招待中</Badge> : null}

                  {editable ? (
                    <form action={roleAction} className="flex items-center gap-2">
                      <input type="hidden" name="memberId" value={member.id} />
                      <label htmlFor={`role-${member.id}`} className="sr-only">
                        権限を変更
                      </label>
                      <select
                        id={`role-${member.id}`}
                        name="role"
                        defaultValue={member.role}
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                        className="h-9 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] font-semibold text-navy focus:border-brand focus:outline-none"
                      >
                        {ASSIGNABLE.filter((role) => roleAtLeast(viewerRole, role)).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </form>
                  ) : (
                    <Badge tone={member.role === 'OWNER' ? 'navy' : 'neutral'}>{ROLE_LABELS[member.role]}</Badge>
                  )}

                  {editable ? (
                    <form action={removeAction}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <button
                        type="submit"
                        className="rounded-[10px] px-2.5 py-1.5 text-[12px] font-semibold text-danger transition-colors hover:bg-danger-wash"
                      >
                        削除
                      </button>
                    </form>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <dl className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
              <div key={role} className="rounded-[10px] bg-canvas-alt px-3 py-2">
                <dt className="text-[12px] font-bold text-navy">{ROLE_LABELS[role]}</dt>
                <dd className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{ROLE_DESCRIPTIONS[role]}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader
            icon={<UserPlus className="h-4 w-4" />}
            title="メンバーを追加"
            description="すでにアカウントを作成済みのメールアドレスを指定してください。"
          />
          <CardBody>
            {inviteState && !inviteState.ok ? (
              <ErrorState className="mb-4" title={inviteState.message} hint={inviteState.hint} />
            ) : null}

            <form action={inviteAction} className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <Field label="メールアドレス" htmlFor="invite-email" required>
                <Input id="invite-email" name="email" type="email" required placeholder="member@company.co.jp" />
              </Field>
              <Field label="権限" htmlFor="invite-role">
                <Select id="invite-role" name="role" defaultValue="EDITOR">
                  {ASSIGNABLE.filter((role) => roleAtLeast(viewerRole, role)).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton>追加する</SubmitButton>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
