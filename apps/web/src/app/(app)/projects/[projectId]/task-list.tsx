'use client'

import { useState } from 'react'
import { api } from '@/hooks/api'
import { cn } from '@/lib/cn'

type Task = { id: string; title: string; detail: string | null; done: boolean; stage: string }

export function TaskList({ tasks: initial }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial)

  if (tasks.length === 0) {
    return <p className="py-6 text-center text-[13px] text-ink-muted">タスクはまだありません。「販売準備」からAIチェックリストを生成できます。</p>
  }

  const toggle = (task: Task) => {
    setTasks((previous) => previous.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)))
    void api('/api/tasks', { method: 'PATCH', body: { taskId: task.id, done: !task.done } }).catch(() => {
      setTasks((previous) => previous.map((item) => (item.id === task.id ? { ...item, done: task.done } : item)))
    })
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <label
            className={cn(
              'flex cursor-pointer items-start gap-3 border border-line px-4 py-3 transition-colors hover:border-line-strong',
              task.done && 'opacity-55',
            )}
          >
            <input type="checkbox" checked={task.done} onChange={() => toggle(task)} className="mt-1 h-4 w-4 accent-brand" />
            <span className="min-w-0">
              <span className={cn('block text-[13px] font-semibold', task.done && 'line-through')}>{task.title}</span>
              {task.detail ? <span className="mt-0.5 block text-[12px] text-ink-muted">{task.detail}</span> : null}
              <span className="mt-0.5 block text-[11px] text-ink-subtle">{task.stage}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}
