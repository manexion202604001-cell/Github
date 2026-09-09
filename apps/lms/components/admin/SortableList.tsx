'use client'
import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortableItem = { id: string }

/**
 * HTML5 DnD + 上下ボタンの並び替えリスト（ADM-02）。
 * ドロップ時に新しい順序の ID 配列で onReorder を呼ぶ。上下ボタンはキーボード操作用。
 */
export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  className,
  itemClassName,
  disabled = false,
  group,
}: {
  items: T[]
  onReorder: (ids: string[]) => void
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  itemClassName?: string
  disabled?: boolean
  /** 同じ group 同士でのみドロップ可能 */
  group?: string
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const key = `application/x-sortable${group ? `-${group}` : ''}`

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return
    const ids = items.map((i) => i.id)
    const [id] = ids.splice(from, 1)
    if (!id) return
    ids.splice(to, 0, id)
    onReorder(ids)
  }

  return (
    <ul className={cn('space-y-1', className)}>
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable={!disabled}
          onDragStart={(e) => {
            e.dataTransfer.setData(key, item.id)
            e.dataTransfer.effectAllowed = 'move'
            setDragId(item.id)
          }}
          onDragEnd={() => {
            setDragId(null)
            setOverId(null)
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(key)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (overId !== item.id) setOverId(item.id)
          }}
          onDragLeave={() => {
            if (overId === item.id) setOverId(null)
          }}
          onDrop={(e) => {
            const id = e.dataTransfer.getData(key)
            if (!id) return
            e.preventDefault()
            const from = items.findIndex((i) => i.id === id)
            if (from >= 0) move(from, index)
            setDragId(null)
            setOverId(null)
          }}
          className={cn(
            'flex items-center gap-2 rounded border bg-paper-100 px-2 transition-colors',
            dragId === item.id && 'opacity-40',
            overId === item.id && dragId !== item.id && 'border-bronze-500',
            itemClassName,
          )}
        >
          <span className={cn('shrink-0 text-stone-300', !disabled && 'cursor-grab')} aria-hidden>
            <GripVertical className="size-4 stroke-[1.5]" />
          </span>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
          <div className="flex shrink-0 flex-col">
            <button
              type="button"
              className="text-stone-400 hover:text-bronze-500 disabled:opacity-30"
              aria-label="上へ"
              disabled={disabled || index === 0}
              onClick={() => move(index, index - 1)}
            >
              <ChevronUp className="size-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              className="text-stone-400 hover:text-bronze-500 disabled:opacity-30"
              aria-label="下へ"
              disabled={disabled || index === items.length - 1}
              onClick={() => move(index, index + 1)}
            >
              <ChevronDown className="size-4 stroke-[1.5]" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
