'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COLORS = ['#135dff', '#248cff', '#39c6ff', '#6b5cf6', '#0e2a55', '#67748a']

/** カテゴリー別の企画数(要件12)。 */
export function CategoryChart({ data }: { data: { category: string; label: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-[200px] items-center justify-center text-center text-[13px] text-ink-muted">
        企画を生成すると、
        <br />
        カテゴリーの偏りが確認できます。
      </p>
    )
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={104} tick={{ fontSize: 11, fill: '#67748a' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: '#eef3fa' }}
            contentStyle={{ borderRadius: 12, border: '1px solid #dee7f2', fontSize: 12 }}
            formatter={(value: number) => [`${value}件`, '企画']}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
