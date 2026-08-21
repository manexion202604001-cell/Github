import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function DataTable<T>({
  rows,
  columns,
  empty,
  rowKey,
  className,
}: {
  rows: T[]
  columns: { key: string; header: ReactNode; render: (row: T) => ReactNode; align?: 'left' | 'right'; width?: string }[]
  empty?: ReactNode
  rowKey: (row: T) => string
  className?: string
}) {
  if (rows.length === 0 && empty) return <>{empty}</>

  return (
    <div className={cn('mx-scrollbar overflow-x-auto', className)}>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'px-4 py-3 text-[12px] font-semibold whitespace-nowrap text-ink-subtle',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line/60 last:border-0 hover:bg-canvas-alt/60">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3 align-middle', column.align === 'right' ? 'text-right tabular' : 'text-left')}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
