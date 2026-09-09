'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { FormMessage } from '@/components/ui/FormMessage'
import { toast } from '@/components/ui/Toaster'
import { createInvitations, type InvitationSummary } from '@/lib/actions/admin/members'
import { ROLE_LABEL } from '@/lib/utils'

type Role = 'student' | 'instructor' | 'admin'

/** CSV（1 列目 email、任意 2 列目 role）を { email, role } に分解する */
function parseCsv(text: string): { email: string; role?: Role }[] {
  const out: { email: string; role?: Role }[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const cols = line.split(/[,\t;]/).map((c) => c.trim().replace(/^"|"$/g, ''))
    const email = cols[0] ?? ''
    if (!email || /^e-?mail$/i.test(email)) continue
    const role = cols[1]
    out.push({ email, role: role === 'student' || role === 'instructor' || role === 'admin' ? role : undefined })
  }
  return out
}

/** AUTH-01 / ADM-04: 招待発行（複数行入力 or CSV アップロード） */
export function InviteForm() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [result, setResult] = useState<InvitationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = (entries: { email: string; role?: Role }[]) => {
    setError(null)
    setResult(null)
    start(async () => {
      // ロール指定のある CSV 行はロールごとにまとめて送る
      const groups = new Map<Role, string[]>()
      for (const e of entries) {
        const r = e.role ?? role
        groups.set(r, [...(groups.get(r) ?? []), e.email])
      }
      const merged: InvitationSummary = { sent: [], skipped: [] }
      for (const [r, list] of groups) {
        const res = await createInvitations(list, r)
        if (!res.ok) {
          setError(res.error)
          continue
        }
        merged.sent.push(...res.data.sent)
        merged.skipped.push(...res.data.skipped)
      }
      setResult(merged)
      if (merged.sent.length) {
        toast(`${merged.sent.length} 件の招待を送信しました。`)
        setEmails('')
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const entries = emails
            .split(/[\n,;\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((email) => ({ email }))
          if (entries.length === 0) return setError('メールアドレスを入力してください。')
          submit(entries)
        }}
      >
        <Field label="メールアドレス" htmlFor="invite-emails" hint="1 行に 1 件。カンマ・空白区切りも可。">
          <Textarea id="invite-emails" value={emails} onChange={(e) => setEmails(e.target.value)} className="min-h-[100px] font-mono text-[13px]" placeholder="taro@example.com" />
        </Field>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="ロール" htmlFor="invite-role">
            <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-9 w-32 text-[13px]">
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? '送信中…' : '招待を送信'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const text = await f.text()
              const entries = parseCsv(text)
              if (fileRef.current) fileRef.current.value = ''
              if (entries.length === 0) return setError('CSV に有効な行がありません。')
              submit(entries)
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
            CSV から一括招待
          </Button>
          <span className="caption">CSV: 1 列目 email、2 列目 role（任意）</span>
        </div>
      </form>
      <FormMessage message={error} />
      {result && (
        <div className="space-y-2 rounded border bg-paper-200 p-4 font-sans text-[13px]">
          <p className="tnum">送信: {result.sent.length} 件</p>
          {result.skipped.length > 0 && (
            <ul className="space-y-1">
              {result.skipped.map((s, i) => (
                <li key={`${s.email}-${i}`} className="caption">
                  {s.email} — {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
