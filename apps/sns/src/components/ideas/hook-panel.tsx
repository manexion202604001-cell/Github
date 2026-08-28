'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles } from 'lucide-react'
import { generateHooksAction, selectHookAction } from '@/features/ideas/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { HOOK_TYPES, labelOf } from '@/lib/config/taxonomy'
import type { ActionResult } from '@/lib/errors'
import { cn } from '@/lib/cn'

type Hook = { id: string; hookType: string; text: string; rationale: string | null; isSelected: boolean }

/** Hook Generator(要件28)。台本作成前に複数パターンから1つ選ぶ。 */
export function HookPanel({ ideaId, hooks, currentHook }: { ideaId: string; hooks: Hook[]; currentHook: string }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [, selectAction] = useActionState<ActionResult | null, FormData>(selectHookAction, null)

  function generate() {
    startTransition(async () => {
      const result = await generateHooksAction(ideaId)
      if (result.ok) {
        toast.ai(`Hookを${result.data.count}パターン作成しました。`)
        router.refresh()
      } else {
        toast.error(result.message, result.hint ?? undefined)
      }
    })
  }

  return (
    <Card>
      <CardHeader
        icon={<Sparkles className="h-4 w-4" />}
        title="Hookの候補"
        description="冒頭の一言を型ごとに作り分けて比較します。選んだHookは台本生成へ引き継がれます。"
        action={
          <Button variant="secondary" size="sm" onClick={generate} loading={pending}>
            {hooks.length > 0 ? '作り直す' : 'Hookを生成'}
          </Button>
        }
      />
      <CardBody>
        {hooks.length === 0 ? (
          <p className="text-[13px] text-ink-muted">
            まだHookの候補がありません。「Hookを生成」を押すと、型の異なる5パターン以上を作成します。
          </p>
        ) : (
          <ul className="space-y-2">
            {hooks.map((hook) => {
              const selected = hook.isSelected || hook.text === currentHook
              return (
                <li key={hook.id}>
                  <form
                    action={(form) => {
                      form.set('ideaId', ideaId)
                      form.set('hookId', hook.id)
                      selectAction(form)
                      toast.success('Hookを選択しました。')
                    }}
                  >
                    <button
                      type="submit"
                      className={cn(
                        'w-full rounded-[14px] border px-4 py-3 text-left transition-colors',
                        selected ? 'border-brand bg-brand-wash' : 'border-line bg-surface hover:border-brand/40',
                      )}
                      aria-pressed={selected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[14px] font-semibold leading-snug text-navy">「{hook.text}」</p>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge tone={selected ? 'brand' : 'neutral'}>{labelOf(HOOK_TYPES, hook.hookType)}</Badge>
                          {selected ? <Check className="h-4 w-4 text-brand" aria-label="選択中" /> : null}
                        </span>
                      </div>
                      {hook.rationale ? <p className="mt-1.5 text-[12px] text-ink-muted">{hook.rationale}</p> : null}
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
