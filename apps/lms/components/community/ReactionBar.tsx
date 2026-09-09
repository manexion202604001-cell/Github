'use client'
import { useOptimistic, useTransition } from 'react'
import { toggleReaction } from '@/lib/actions/community'
import { toast } from '@/components/ui/Toaster'
import { cn, REACTIONS, type ReactionKind } from '@/lib/utils'
import type { ReactionSummary } from '@/lib/db/queries/community'

type TargetType = 'post' | 'comment' | 'qa_thread' | 'qa_reply'

/** COM-04: リアクション（4 種固定・押下でトグル・楽観更新） */
export function ReactionBar({ targetType, targetId, reactions, size = 'md', className }: { targetType: TargetType; targetId: string; reactions: ReactionSummary[]; size?: 'md' | 'sm'; className?: string }) {
  const [pending, start] = useTransition()
  const [state, apply] = useOptimistic(reactions, (prev: ReactionSummary[], kind: ReactionKind) =>
    prev.map((r) => (r.kind === kind ? { ...r, mine: !r.mine, count: Math.max(0, r.count + (r.mine ? -1 : 1)) } : r)),
  )
  const onToggle = (kind: ReactionKind) =>
    start(async () => {
      apply(kind)
      const r = await toggleReaction(targetType, targetId, kind)
      if (!r.ok) toast(r.error)
    })
  return (
    <div className={cn('flex flex-wrap gap-1', className)} role="group" aria-label="リアクション">
      {REACTIONS.map((def) => {
        const s = state.find((x) => x.kind === def.kind) ?? { kind: def.kind, count: 0, mine: false }
        return (
          <button
            key={def.kind}
            type="button"
            onClick={() => onToggle(def.kind)}
            disabled={pending}
            aria-pressed={s.mine}
            aria-label={`${def.label}${s.count > 0 ? ` ${s.count}` : ''}`}
            title={def.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded border font-sans tracking-[0.04em] transition-colors disabled:opacity-60',
              size === 'sm' ? 'h-7 px-2 text-[12px]' : 'h-8 px-2.5 text-[13px]',
              s.mine ? 'border-bronze-500 bg-paper-200 text-ink-900' : 'border-stone-300 text-stone-500 hover:border-bronze-500 hover:text-ink-700',
            )}
          >
            <span aria-hidden>{def.emoji}</span>
            {s.count > 0 && <span className="tnum">{s.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
