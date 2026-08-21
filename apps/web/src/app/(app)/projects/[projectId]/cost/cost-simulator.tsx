'use client'

import { useMemo, useState } from 'react'
import { api } from '@/hooks/api'
import {
  calculateCost,
  priceSweep,
  reverseCalculateMaxCost,
  type CostInput,
} from '@/features/cost-simulation/domain'
import { formatCurrency, formatPercent } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { Slider, Field, Input } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { Stat } from '@/components/ui/stat'

/**
 * スライダー変更で即時再計算するシミュレーター(要件41)。
 * 計算は domain の純粋関数をクライアントでも実行するため、通信なしで反映される。
 */
export function CostSimulator({ projectId, initial }: { projectId: string; initial: CostInput }) {
  const [input, setInput] = useState<CostInput>(initial)
  const [targetProfitRate, setTargetProfitRate] = useState(0.3)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const result = useMemo(() => calculateCost(input), [input])
  const maxCost = useMemo(() => reverseCalculateMaxCost({ ...input, targetProfitRate }), [input, targetProfitRate])
  const sweep = useMemo(
    () =>
      priceSweep(input, {
        from: Math.max(500, Math.round(input.sellingPrice * 0.5)),
        to: Math.max(1000, Math.round(input.sellingPrice * 1.6)),
        steps: 24,
      }),
    [input],
  )

  const set = <K extends keyof CostInput>(key: K, value: number) =>
    setInput((previous) => ({ ...previous, [key]: value }))

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await api('/api/cost-simulation', { method: 'POST', body: { projectId, ...input, targetProfitRate } })
      setMessage({ tone: 'success', text: 'シミュレーションを保存しました。' })
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '保存に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  const yen = (value: number) => formatCurrency(value)

  return (
    <div className="space-y-5">
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="粗利益 / 個" value={yen(result.grossProfit)} sub={`粗利率 ${formatPercent(result.grossProfitRate)}`} />
        <Stat
          label="営業利益 / 個"
          value={yen(result.operatingProfit)}
          sub={`営業利益率 ${formatPercent(result.operatingProfitRate)}`}
          tone="brand"
        />
        <Stat
          label="月間営業利益"
          value={yen(result.monthlyOperatingProfit)}
          sub={`月販 ${input.monthlyUnits.toLocaleString('ja-JP')}個 / 月商 ${yen(result.monthlyRevenue)}`}
        />
        <Stat
          label="損益分岐点"
          value={input.fixedCost > 0 ? `${result.breakEvenUnits.toLocaleString('ja-JP')}個` : '—'}
          sub={`広告許容額 ${yen(result.allowableAdCost)} / 個`}
        />
      </div>

      <Card className="border-brand/40 bg-brand-wash/40">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold text-ink">逆算: 最大許容製造原価</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              販売価格 {yen(input.sellingPrice)}・目標利益率 {formatPercent(targetProfitRate, 0)} の場合、製造原価はこの金額以下に抑える必要があります。
            </p>
          </div>
          <div className="text-right">
            <p className="tabular text-3xl font-bold text-brand">{yen(maxCost)}</p>
            <p className="text-[11px] text-ink-subtle">以下 / 個</p>
          </div>
        </CardBody>
        <CardFooter>
          <Slider
            label="目標営業利益率"
            value={Math.round(targetProfitRate * 100)}
            min={5}
            max={60}
            onChange={(value) => setTargetProfitRate(value / 100)}
            format={(value) => `${value}%`}
          />
        </CardFooter>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="価格・費用" description="スライダーを動かすとリアルタイムで再計算されます。" />
          <CardBody className="space-y-5">
            <Slider label="販売価格" value={input.sellingPrice} min={500} max={50000} step={10} onChange={(value) => set('sellingPrice', value)} format={yen} />
            <Slider label="製造原価" value={input.manufacturingCost} min={0} max={20000} step={10} onChange={(value) => set('manufacturingCost', value)} format={yen} />
            <Slider label="広告費率" value={Math.round(input.advertisingRate * 100)} min={0} max={50} onChange={(value) => set('advertisingRate', value / 100)} format={(value) => `${value}%`} />
            <Slider label="Amazon販売手数料率" value={Math.round(input.amazonFeeRate * 100)} min={0} max={45} onChange={(value) => set('amazonFeeRate', value / 100)} format={(value) => `${value}%`} />
            <Slider label="返品率" value={Math.round(input.returnRate * 100)} min={0} max={30} onChange={(value) => set('returnRate', value / 100)} format={(value) => `${value}%`} />
            <Slider label="月間販売数" value={input.monthlyUnits} min={0} max={5000} step={10} onChange={(value) => set('monthlyUnits', value)} format={(value) => `${value.toLocaleString('ja-JP')}個`} />
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="その他費用(円 / 個)" />
            <CardBody className="grid grid-cols-2 gap-4">
              {(
                [
                  ['fbaFee', 'FBA配送料'],
                  ['shipping', '物流費(国内)'],
                  ['importCost', '輸入費'],
                  ['tax', '関税・税金'],
                  ['packaging', '梱包費'],
                  ['otherCost', 'その他費用'],
                  ['fixedCost', '月間固定費'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <Input
                    type="number"
                    min={0}
                    value={input[key]}
                    onChange={(event) => set(key, Number(event.target.value) || 0)}
                  />
                </Field>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="価格と利益の関係" description="販売価格を変えたときの1個あたり営業利益。" />
            <CardBody>
              <ProfitCurve points={sweep} current={input.sellingPrice} />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void save()} loading={saving}>
          この条件で保存する
        </Button>
      </div>
    </div>
  )
}

/** 依存ライブラリなしのSVG折れ線。 */
function ProfitCurve({
  points,
  current,
}: {
  points: { sellingPrice: number; operatingProfit: number }[]
  current: number
}) {
  if (points.length < 2) return null
  const width = 560
  const height = 180
  const pad = 10

  const xs = points.map((point) => point.sellingPrice)
  const ys = points.map((point) => point.operatingProfit)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys, 1)

  const x = (value: number) => pad + ((value - minX) / (maxX - minX)) * (width - pad * 2)
  const y = (value: number) => height - pad - ((value - minY) / (maxY - minY)) * (height - pad * 2)

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.sellingPrice).toFixed(1)},${y(point.operatingProfit).toFixed(1)}`).join(' ')
  const zeroY = y(0)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="価格別の営業利益カーブ">
      <line x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} stroke="var(--color-line-strong)" strokeDasharray="4 4" />
      <path d={path} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={x(current)} x2={x(current)} y1={pad} y2={height - pad} stroke="var(--color-brand-soft)" strokeDasharray="3 3" />
      <text x={x(current) + 6} y={pad + 12} fontSize="11" fill="var(--color-ink-muted)">
        現在 {current.toLocaleString('ja-JP')}円
      </text>
    </svg>
  )
}
