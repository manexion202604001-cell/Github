'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * 2系列目にブランドのシアン(#39c6ff)を使わないのは、白地でのコントラストが
 * 1.96:1 と低く線として読めないため。#12a3a3 は色覚特性下でも青と分離する。
 */
const SERIES = [
  { key: 'ideas', label: '企画', color: '#135dff' },
  { key: 'scripts', label: '台本', color: '#12a3a3' },
] as const

/** 企画・台本の作成推移(要件12)。 */
export function ActivityChart({ data }: { data: { week: string; ideas: number; scripts: number }[] }) {
  const hasData = data.some((point) => point.ideas > 0 || point.scripts > 0)

  if (!hasData) {
    return (
      <p className="flex h-[200px] items-center justify-center text-center text-[13px] text-ink-muted">
        まだ作成実績がありません。
        <br />
        企画や台本を作ると推移が表示されます。
      </p>
    )
  }

  return (
    <div className="w-full">
      {/* 2系列あるため凡例を必ず置く。色だけで系列を区別させない。 */}
      <ul className="mb-2.5 flex flex-wrap gap-4">
        {SERIES.map((series) => (
          <li key={series.key} className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: series.color }} aria-hidden="true" />
            {series.label}
          </li>
        ))}
      </ul>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="ideas-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#135dff" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#135dff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="scripts-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#12a3a3" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#12a3a3" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e4ecf7" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#93a0b5' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#93a0b5' }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #dee7f2', fontSize: 12, boxShadow: '0 8px 30px rgba(15,39,80,0.1)' }}
              labelStyle={{ color: '#0b1736', fontWeight: 700 }}
              formatter={(value: number, name: string) => [`${value}件`, name === 'ideas' ? '企画' : '台本']}
            />
            <Area type="monotone" dataKey="ideas" stroke="#135dff" strokeWidth={2} fill="url(#ideas-fill)" />
            <Area type="monotone" dataKey="scripts" stroke="#12a3a3" strokeWidth={2} fill="url(#scripts-fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
