'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/Toaster'
import { updateXpRule } from '@/lib/actions/admin/gamification'
import { XP_ACTION_LABEL, type XpAction, type XpRule } from '@/lib/xp'

/** ADM-09: XP テーブル編集（行ごとに保存） */
export function XpRulesForm({ rules }: { rules: XpRule[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState<Record<string, { xp: string; dailyCap: string }>>(() =>
    Object.fromEntries(rules.map((r) => [r.action, { xp: String(r.xp), dailyCap: r.dailyCap == null ? '' : String(r.dailyCap) }])),
  )

  return (
    <Table>
      <thead>
        <tr>
          <Th>アクション</Th>
          <Th className="w-32">XP</Th>
          <Th className="w-40">1 日の上限（XP）</Th>
          <Th className="w-24" />
        </tr>
      </thead>
      <tbody>
        {rules.map((r) => {
          const d = draft[r.action] ?? { xp: '', dailyCap: '' }
          const dirty = d.xp !== String(r.xp) || d.dailyCap !== (r.dailyCap == null ? '' : String(r.dailyCap))
          return (
            <tr key={r.action}>
              <Td>
                {XP_ACTION_LABEL[r.action as XpAction] ?? r.action}
                <p className="caption font-mono">{r.action}</p>
              </Td>
              <Td>
                <Input type="number" min={0} max={10000} value={d.xp} aria-label={`${r.action} の XP`} className="h-9 tnum" onChange={(e) => setDraft((s) => ({ ...s, [r.action]: { ...d, xp: e.target.value } }))} />
              </Td>
              <Td>
                <Input type="number" min={1} max={100000} value={d.dailyCap} placeholder="なし" aria-label={`${r.action} の日次上限`} className="h-9 tnum" onChange={(e) => setDraft((s) => ({ ...s, [r.action]: { ...d, dailyCap: e.target.value } }))} />
              </Td>
              <Td>
                <Button
                  type="button"
                  size="sm"
                  variant={dirty ? 'primary' : 'ghost'}
                  disabled={pending || !dirty}
                  onClick={() =>
                    start(async () => {
                      const res = await updateXpRule(r.action, Number(d.xp), d.dailyCap === '' ? null : Number(d.dailyCap))
                      toast(res.ok ? '保存しました。' : res.error)
                      if (res.ok) router.refresh()
                    })
                  }
                >
                  保存
                </Button>
              </Td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}
