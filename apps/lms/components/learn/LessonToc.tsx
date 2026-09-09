'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import { isLessonUnlocked } from '@/lib/xp'

type Section = { id: string; title: string; lessons: { id: string; title: string; durationMin: number | null }[] }

export function LessonToc({
  slug,
  sections,
  completed,
  currentId,
  progress,
  lessonOrder,
  isSequential,
  collapsible = false,
}: {
  slug: string
  sections: Section[]
  completed: string[]
  currentId: string
  progress: number
  lessonOrder: string[]
  isSequential: boolean
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)
  const done = new Set(completed)
  return (
    <div className="rounded border bg-paper-200 p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => collapsible && setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!collapsible}
      >
        <span className="eyebrow">Contents</span>
        {collapsible && <ChevronDown className={cn('size-4 stroke-[1.5] text-stone-500 transition-transform', open && 'rotate-180')} />}
      </button>
      <ProgressBar value={progress} className="mt-3" />
      {open && (
        <div className="mt-5 space-y-5">
          {sections.map((s) => (
            <div key={s.id}>
              <p className="ui-label mb-1 text-stone-500">{s.title}</p>
              <ul>
                {s.lessons.map((l) => {
                  const isDone = done.has(l.id)
                  const current = l.id === currentId
                  const unlocked = isLessonUnlocked(isSequential, lessonOrder, l.id, done)
                  const cls = cn(
                    'relative flex items-center gap-2 rounded px-2 py-1.5 font-sans text-[13px] tracking-[0.04em] no-underline',
                    current && 'bg-paper-100 text-ink-900 before:absolute before:inset-y-1.5 before:left-0 before:w-[2px] before:bg-bronze-500',
                    !unlocked && 'text-stone-400',
                  )
                  const inner = (
                    <>
                      <span className={cn('flex size-4 items-center justify-center', isDone ? 'text-bronze-500' : 'text-stone-400')}>
                        {isDone ? <Check className="size-3.5 stroke-[1.5]" /> : !unlocked ? <Lock className="size-3.5 stroke-[1.5]" /> : current ? <span className="size-1.5 rounded-full bg-bronze-500" /> : <span className="size-1.5 rounded-full border border-stone-400" />}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      {l.durationMin && <span className="caption tnum">{l.durationMin}分</span>}
                    </>
                  )
                  return (
                    <li key={l.id}>
                      {unlocked ? <Link href={`/courses/${slug}/lessons/${l.id}`} className={cls} aria-current={current ? 'page' : undefined}>{inner}</Link> : <span className={cls}>{inner}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
