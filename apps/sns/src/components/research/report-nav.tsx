'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export type ReportSection = { key: string; label: string; jaLabel: string; count: number }

/**
 * レポート内ナビゲーション(要件80, 91)。
 * Desktop は左固定リスト、Mobile は横スクロールのチップに切り替える。
 */
export function ReportNav({ sections }: { sections: ReportSection[] }) {
  const [active, setActive] = useState(sections[0]?.key ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const first = visible[0]
        if (first) setActive(first.target.id.replace('section-', ''))
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 },
    )

    for (const section of sections) {
      const element = document.getElementById(`section-${section.key}`)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <>
      <nav className="no-print scroll-x -mx-1 flex gap-1.5 px-1 lg:hidden" aria-label="レポート内ナビゲーション">
        {sections.map((section) => (
          <a
            key={section.key}
            href={`#section-${section.key}`}
            className={cn(
              'shrink-0 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-colors',
              active === section.key ? 'bg-brand-wash text-brand' : 'bg-surface text-ink-muted',
            )}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <nav className="no-print hidden lg:block" aria-label="レポート内ナビゲーション">
        <ul className="space-y-0.5">
          {sections.map((section) => (
            <li key={section.key}>
              <a
                href={`#section-${section.key}`}
                aria-current={active === section.key ? 'true' : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors',
                  active === section.key ? 'bg-brand-wash text-navy' : 'text-ink-muted hover:bg-canvas-alt hover:text-navy',
                )}
              >
                <span className="min-w-0 truncate">{section.label}</span>
                <span className={cn('tabular text-[11px]', active === section.key ? 'text-brand' : 'text-ink-subtle')}>
                  {section.count}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
