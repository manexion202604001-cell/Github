'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Clock, FileText, Star } from 'lucide-react'
import { toggleFavoriteAction } from '@/features/ideas/actions'
import { Badge } from '@/components/ui/badge'
import { ScoreGauge } from '@/components/ui/score-gauge'
import { useToast } from '@/components/ui/toast'
import { channelLabel } from '@/lib/config/channels'
import { ideaCategoryLabel } from '@/lib/config/taxonomy'
import { formatSeconds } from '@/lib/format'
import { cn } from '@/lib/cn'

export type IdeaCardData = {
  id: string
  title: string
  category: string
  channel: string
  hook: string
  whyThisIdea: string
  cta: string | null
  durationSec: number
  difficulty: string
  isFavorite: boolean
  score: number | null
  scriptCount: number
}

const DIFFICULTY_TONE: Record<string, 'positive' | 'warning' | 'danger' | 'neutral'> = {
  LOW: 'positive',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

/**
 * 企画カード(要件24, 82)。
 * BtoBで比較しやすいよう、Masonryではなく高さの揃うGridで並べる。
 */
export function IdeaCard({ idea }: { idea: IdeaCardData }) {
  const toast = useToast()
  const [favorite, setFavorite] = useState(idea.isFavorite)
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const result = await toggleFavoriteAction(idea.id)
      if (result.ok) {
        setFavorite(result.data.isFavorite)
      } else {
        toast.error(result.message, result.hint ?? undefined)
      }
    })
  }

  return (
    <article className="flex flex-col rounded-[18px] border border-line bg-surface shadow-[0_8px_30px_rgba(15,39,80,0.06)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-[0_16px_44px_rgba(15,39,80,0.1)]">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <Badge tone="brand">{ideaCategoryLabel(idea.category)}</Badge>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-pressed={favorite}
            aria-label={favorite ? 'お気に入りを解除' : 'お気に入りに追加'}
            className={cn(
              'rounded-full p-1.5 transition-colors',
              favorite ? 'text-accent' : 'text-ink-subtle hover:bg-canvas-alt hover:text-navy',
            )}
          >
            <Star className={cn('h-4 w-4', favorite && 'fill-current')} />
          </button>
          {idea.score !== null ? <ScoreGauge value={idea.score} size="sm" /> : null}
        </div>
      </div>

      <div className="flex-1 px-5 pt-3">
        <Link href={`/ideas/${idea.id}`} className="block text-[15px] font-bold leading-snug text-navy hover:text-brand">
          {idea.title}
        </Link>
        <p className="mt-2.5 rounded-[10px] bg-canvas-alt px-3 py-2 text-[13px] font-semibold leading-snug text-navy">
          「{idea.hook}」
        </p>
        <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-ink-muted">{idea.whyThisIdea}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-5 text-[11px] text-ink-muted">
        <span>{channelLabel(idea.channel)}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatSeconds(idea.durationSec)}
        </span>
        <Badge tone={DIFFICULTY_TONE[idea.difficulty] ?? 'neutral'}>{idea.difficulty}</Badge>
      </div>

      {idea.cta ? <p className="mt-2 truncate px-5 text-[11px] text-ink-subtle">CTA: {idea.cta}</p> : null}

      <div className="mt-4 flex items-center gap-2 border-t border-line px-5 py-3">
        <Link
          href={`/ideas/${idea.id}`}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-[10px] border border-line px-3 text-[13px] font-semibold text-navy transition-colors hover:bg-canvas-alt"
        >
          詳細を見る
        </Link>
        <Link
          href={idea.scriptCount > 0 ? `/scripts?ideaId=${idea.id}` : `/ideas/${idea.id}#script`}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {idea.scriptCount > 0 ? `台本 ${idea.scriptCount}件` : '台本を作る'}
        </Link>
      </div>
    </article>
  )
}
