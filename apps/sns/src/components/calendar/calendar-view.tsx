'use client'

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, FileText, Lightbulb, Trash2 } from 'lucide-react'
import { deleteCalendarItemAction, updateCalendarStatusAction } from '@/features/calendar/actions'
import { Card, CardBody } from '@/components/ui/card'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { CALENDAR_STATUSES } from '@/lib/config/taxonomy'
import { channelDefinition, DEFAULT_CHANNEL } from '@/lib/config/channels'
import { CalendarAddButton } from './add-button'
import { formatDateTime } from '@/lib/format'
import type { ActionResult } from '@/lib/errors'
import { cn } from '@/lib/cn'

export type CalendarItemData = {
  id: string
  title: string
  channel: string
  status: string
  scheduledAt: string
  assigneeName: string | null
  ideaId: string | null
  scriptId: string | null
  notes: string | null
}

type ViewMode = 'month' | 'week' | 'list'

const STATUS_TONE: Record<string, BadgeTone> = {
  IDEA: 'neutral',
  SCRIPT: 'cyan',
  READY: 'brand',
  PLANNED: 'brand',
  POSTED: 'positive',
  ARCHIVED: 'neutral',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** Month / Week / List の表示切替(要件41)。 */
export function CalendarView({ brandId, items }: { brandId: string; items: CalendarItemData[] }) {
  const [mode, setMode] = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(() => new Date())

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItemData[]>()
    for (const item of items) {
      // ローカル時刻で日付を切る。UTC文字列のまま切ると、夜の予定が前日に入る。
      const key = dateKey(new Date(item.scheduledAt))
      const bucket = map.get(key) ?? []
      bucket.push(item)
      map.set(key, bucket)
    }
    return map
  }, [items])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="まだ投稿予定がありません"
        description="企画や台本の画面から「カレンダーへ追加」を押すと、投稿予定として登録できます。"
        action={
          <div className="w-56">
            <CalendarAddButton brandId={brandId} defaultTitle="" defaultChannel={DEFAULT_CHANNEL} />
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[12px] border border-line bg-surface p-1" role="tablist" aria-label="表示モード">
          {(['month', 'week', 'list'] as ViewMode[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition-colors',
                mode === value ? 'bg-brand-wash text-brand' : 'text-ink-muted hover:text-navy',
              )}
            >
              {value === 'month' ? 'Month' : value === 'week' ? 'Week' : 'List'}
            </button>
          ))}
        </div>

        {mode !== 'list' ? (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAnchor(shift(anchor, mode, -1))}
              aria-label="前へ"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <p className="min-w-[9rem] text-center text-[14px] font-bold text-navy">
              {mode === 'month'
                ? `${anchor.getFullYear()}年 ${anchor.getMonth() + 1}月`
                : `${anchor.getMonth() + 1}/${startOfWeek(anchor).getDate()} 週`}
            </p>
            <Button variant="secondary" size="sm" onClick={() => setAnchor(shift(anchor, mode, 1))} aria-label="次へ">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
              今日
            </Button>
          </div>
        ) : null}

        <p className="ml-auto text-[12px] text-ink-muted">
          <span className="tabular">{items.length}</span> 件の投稿予定
        </p>
        <div className="w-full sm:w-auto">
          <CalendarAddButton brandId={brandId} defaultTitle="" defaultChannel={DEFAULT_CHANNEL} />
        </div>
      </div>

      {mode === 'month' ? <MonthGrid anchor={anchor} byDay={byDay} /> : null}
      {mode === 'week' ? <WeekList anchor={anchor} byDay={byDay} /> : null}
      {mode === 'list' ? <ItemList items={items} /> : null}
    </div>
  )
}

function MonthGrid({ anchor, byDay }: { anchor: Date; byDay: Map<string, CalendarItemData[]> }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
  const todayKey = dateKey(new Date())

  return (
    <Card>
      <CardBody className="p-0 sm:p-0">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-[11px] font-bold text-ink-subtle">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const key = dateKey(date)
            const dayItems = byDay.get(key) ?? []
            const inMonth = date.getMonth() === anchor.getMonth()
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[92px] border-b border-r border-line p-1.5 last:border-r-0',
                  !inMonth && 'bg-canvas/60',
                )}
              >
                <p
                  className={cn(
                    'tabular text-[11px]',
                    key === todayKey ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white' : inMonth ? 'text-ink-muted' : 'text-ink-subtle',
                  )}
                >
                  {date.getDate()}
                </p>
                <ul className="mt-1 space-y-1">
                  {dayItems.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <span
                        className="block truncate rounded-[6px] bg-brand-wash px-1.5 py-0.5 text-[11px] font-semibold text-brand"
                        title={item.title}
                      >
                        {item.title}
                      </span>
                    </li>
                  ))}
                  {dayItems.length > 3 ? (
                    <li className="px-1.5 text-[10px] text-ink-subtle">ほか {dayItems.length - 3} 件</li>
                  ) : null}
                </ul>
              </div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}

function WeekList({ anchor, byDay }: { anchor: Date; byDay: Map<string, CalendarItemData[]> }) {
  const start = startOfWeek(anchor)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {days.map((date) => {
        const key = dateKey(date)
        const dayItems = byDay.get(key) ?? []
        return (
          <Card key={key}>
            <CardBody>
              <p className="text-[12px] font-bold text-navy">
                {date.getMonth() + 1}/{date.getDate()}（{WEEKDAYS[date.getDay()]}）
              </p>
              {dayItems.length === 0 ? (
                <p className="mt-2 text-[12px] text-ink-subtle">予定なし</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {dayItems.map((item) => (
                    <li key={item.id}>
                      <ItemCard item={item} compact />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

function ItemList({ items }: { items: CalendarItemData[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function ItemCard({ item, compact = false }: { item: CalendarItemData; compact?: boolean }) {
  const [, statusAction] = useActionState<ActionResult | null, FormData>(updateCalendarStatusAction, null)
  const [, deleteAction] = useActionState<ActionResult | null, FormData>(deleteCalendarItemAction, null)
  const channel = channelDefinition(item.channel)

  return (
    <div className={cn('rounded-[14px] border border-line bg-surface', compact ? 'px-3 py-2' : 'px-4 py-3')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('font-bold text-navy', compact ? 'text-[13px]' : 'text-[14px]')}>{item.title}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {formatDateTime(item.scheduledAt)} ・ {channel?.shortLabel ?? item.channel}
            {item.assigneeName ? ` ・ ${item.assigneeName}` : ''}
          </p>
        </div>
        <Badge tone={STATUS_TONE[item.status] ?? 'neutral'}>{item.status}</Badge>
      </div>

      {!compact ? (
        <>
          {item.notes ? <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{item.notes}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
            {item.ideaId ? (
              <Link
                href={`/ideas/${item.ideaId}`}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
              >
                <Lightbulb className="h-3 w-3" aria-hidden="true" />
                企画
              </Link>
            ) : null}
            {item.scriptId ? (
              <Link
                href={`/scripts/${item.scriptId}`}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
              >
                <FileText className="h-3 w-3" aria-hidden="true" />
                台本
              </Link>
            ) : null}

            <form action={statusAction} className="ml-auto flex items-center gap-2">
              <input type="hidden" name="itemId" value={item.id} />
              <label htmlFor={`status-${item.id}`} className="sr-only">
                ステータスを変更
              </label>
              <select
                id={`status-${item.id}`}
                name="status"
                defaultValue={item.status}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="h-8 rounded-[8px] border border-line bg-surface px-2 text-[12px] font-semibold text-navy focus:border-brand focus:outline-none"
              >
                {CALENDAR_STATUSES.map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
              </select>
            </form>

            <form
              action={(form) => {
                form.set('itemId', item.id)
                deleteAction(form)
              }}
            >
              <button
                type="submit"
                aria-label="投稿予定を削除"
                className="rounded-[8px] p-1.5 text-ink-subtle transition-colors hover:bg-danger-wash hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  )
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfWeek(date: Date): Date {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  start.setHours(0, 0, 0, 0)
  return start
}

function shift(date: Date, mode: ViewMode, direction: 1 | -1): Date {
  const next = new Date(date)
  if (mode === 'month') next.setMonth(date.getMonth() + direction)
  else next.setDate(date.getDate() + direction * 7)
  return next
}
