'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, RefreshCw, Star, Trash2 } from 'lucide-react'
import { deleteIdeaAction, generateSimilarAction, rescoreIdeaAction, toggleFavoriteAction } from '@/features/ideas/actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import type { ActionResult } from '@/lib/errors'
import type { GenerateIdeasResult } from '@/features/ideas/service'
import { cn } from '@/lib/cn'

/** 企画に対する操作(要件27)。 */
export function IdeaActions({ ideaId, isFavorite, title }: { ideaId: string; isFavorite: boolean; title: string }) {
  const router = useRouter()
  const toast = useToast()
  const [favorite, setFavorite] = useState(isFavorite)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [, deleteAction, deletePending] = useActionState<ActionResult | null, FormData>(deleteIdeaAction, null)
  const [, similarAction, similarPending] = useActionState<ActionResult<GenerateIdeasResult> | null, FormData>(
    generateSimilarAction,
    null,
  )

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        className={cn(favorite && 'border-accent bg-accent/20 text-[#7a5a00]')}
        onClick={() =>
          startTransition(async () => {
            const result = await toggleFavoriteAction(ideaId)
            if (result.ok) setFavorite(result.data.isFavorite)
            else toast.error(result.message, result.hint ?? undefined)
          })
        }
        disabled={pending}
      >
        <Star className={cn('h-3.5 w-3.5', favorite && 'fill-current')} aria-hidden="true" />
        {favorite ? 'お気に入り' : 'お気に入りに追加'}
      </Button>

      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await rescoreIdeaAction(ideaId)
            if (result.ok) {
              toast.ai('スコアを再評価しました。')
              router.refresh()
            } else {
              toast.error(result.message, result.hint ?? undefined)
            }
          })
        }
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        再評価
      </Button>

      <form
        action={(form) => {
          form.set('ideaId', ideaId)
          similarAction(form)
          toast.ai('似た企画を生成しています…')
        }}
      >
        <Button type="submit" variant="secondary" size="sm" loading={similarPending}>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          似た企画を作る
        </Button>
      </form>

      <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        削除
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        loading={deletePending}
        onConfirm={() => {
          const form = new FormData()
          form.set('ideaId', ideaId)
          form.set('redirectTo', '/ideas')
          deleteAction(form)
        }}
        title="企画を削除しますか？"
        message={`「${title}」を削除します。この企画から作成済みの台本は残ります。`}
      />
    </div>
  )
}
