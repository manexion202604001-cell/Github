'use client'

import { useActionState, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteScriptAction, updateScriptStatusAction } from '@/features/scripts/actions'
import { ConfirmDialog } from '@/components/ui/dialog'
import type { ActionResult } from '@/lib/errors'

const STATUSES = [
  { key: 'DRAFT', label: '下書き' },
  { key: 'REVIEW', label: '確認中' },
  { key: 'READY', label: '撮影可' },
  { key: 'ARCHIVED', label: 'アーカイブ' },
]

export function ScriptHeaderActions({ scriptId, status, title }: { scriptId: string; status: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [, statusAction] = useActionState<ActionResult | null, FormData>(updateScriptStatusAction, null)
  const [, deleteAction, deletePending] = useActionState<ActionResult | null, FormData>(deleteScriptAction, null)

  return (
    <>
      <form action={statusAction}>
        <input type="hidden" name="scriptId" value={scriptId} />
        <label htmlFor="script-status" className="sr-only">
          ステータスを変更
        </label>
        <select
          id="script-status"
          name="status"
          defaultValue={status}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-10 rounded-[12px] border border-line bg-surface px-3 text-sm font-semibold text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        >
          {STATUSES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </form>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-wash"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        削除
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={deletePending}
        onConfirm={() => {
          const form = new FormData()
          form.set('scriptId', scriptId)
          deleteAction(form)
        }}
        title="台本を削除しますか？"
        message={`「${title}」を削除します。カレンダーに登録済みの投稿予定は残ります。`}
      />
    </>
  )
}
