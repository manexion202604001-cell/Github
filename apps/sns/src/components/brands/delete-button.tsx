'use client'

import { useActionState, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteBrandAction } from '@/features/brands/actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import type { ActionResult } from '@/lib/errors'

export function DeleteBrandButton({ brandId, name }: { brandId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [, action, pending] = useActionState<ActionResult | null, FormData>(deleteBrandAction, null)

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        ブランドを削除
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={pending}
        onConfirm={() => {
          const form = new FormData()
          form.set('brandId', brandId)
          action(form)
        }}
        title="ブランドを削除しますか？"
        message={`「${name}」を一覧から削除します。調査・企画・台本のデータは内部的に保持されるため、復元が必要な場合は管理者へご相談ください。`}
      />
    </>
  )
}
