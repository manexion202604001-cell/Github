'use client'

import { useActionState, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteResearchAction } from '@/features/research/actions'
import { ConfirmDialog } from '@/components/ui/dialog'
import type { ActionResult } from '@/lib/errors'

export function DeleteResearchButton({ researchId, title }: { researchId: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [, action, pending] = useActionState<ActionResult | null, FormData>(deleteResearchAction, null)

  return (
    <>
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
        onConfirm={() => {
          const form = new FormData()
          form.set('researchId', researchId)
          action(form)
        }}
        loading={pending}
        title="調査を削除しますか？"
        message={`「${title}」を削除します。削除後も内部的には保持されるため、必要な場合は管理者へご相談ください。この調査から生成された企画は残ります。`}
      />
    </>
  )
}
