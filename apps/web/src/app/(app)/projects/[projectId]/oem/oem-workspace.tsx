'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { api } from '@/hooks/api'
import { formatCurrency, formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Notice } from '@/components/ui/feedback'
import { DataTable } from '@/components/ui/table'

type SupplierView = {
  id: string
  name: string
  country: string | null
  contactName: string | null
  email: string | null
  moq: number | null
  leadTimeDays: number | null
  rating: number | null
  note: string | null
}

type QuoteView = {
  id: string
  supplierId: string
  supplierName: string
  status: string
  unitPrice: number | null
  moq: number | null
  sampleCost: number | null
  shippingCost: number | null
  toolingCost: number | null
  leadTimeDays: number | null
  note: string | null
}

type ComparisonView = {
  rows: {
    id: string
    supplierName: string
    country: string | null
    rating: number | null
    unitPrice: number | null
    moq: number | null
    leadTimeDays: number | null
    initialTotal: number
    effectiveUnitCost: number
    withinTarget: boolean | null
  }[]
  best: { id: string } | null
  targetUnitCost: number | null
}

export function OEMWorkspace({
  projectId,
  suppliers,
  quotes,
  comparison,
}: {
  projectId: string
  suppliers: SupplierView[]
  quotes: QuoteView[]
  comparison: ComparisonView
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const call = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'エラーが発生しました')
    }
  }

  return (
    <div className="space-y-5">
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardHeader
          title="見積比較"
          description={
            comparison.targetUnitCost !== null
              ? `目標原価(逆算): ${formatCurrency(comparison.targetUnitCost)} 以下 — 実効単価は初回ロット総額 ÷ MOQ で計算しています。`
              : '利益シミュレーションを保存すると、目標原価との比較が表示されます。'
          }
        />
        <CardBody className="p-0">
          <DataTable
            rows={comparison.rows}
            rowKey={(row) => row.id}
            empty={<EmptyState title="見積がまだありません" description="OEM会社を登録し、見積を入力すると比較表が作成されます。" />}
            columns={[
              {
                key: 'name',
                header: 'OEM会社',
                render: (row) => (
                  <span className="font-semibold">
                    {row.supplierName}
                    {comparison.best?.id === row.id ? <Badge tone="positive" className="ml-2">最有力</Badge> : null}
                  </span>
                ),
              },
              { key: 'unitPrice', header: '単価', align: 'right', render: (row) => formatCurrency(row.unitPrice) },
              { key: 'moq', header: 'MOQ', align: 'right', render: (row) => formatNumber(row.moq) },
              { key: 'initialTotal', header: '初回ロット総額', align: 'right', render: (row) => formatCurrency(row.initialTotal) },
              {
                key: 'effective',
                header: '実効単価',
                align: 'right',
                render: (row) => (
                  <span className={row.withinTarget === false ? 'font-bold text-critical' : row.withinTarget ? 'font-bold text-positive' : ''}>
                    {formatCurrency(row.effectiveUnitCost)}
                  </span>
                ),
              },
              { key: 'lead', header: '納期', align: 'right', render: (row) => (row.leadTimeDays === null ? '—' : `${row.leadTimeDays}日`) },
            ]}
          />
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <SupplierPanel suppliers={suppliers} onCall={call} />
        <QuotePanel projectId={projectId} suppliers={suppliers} quotes={quotes} onCall={call} />
      </div>
    </div>
  )
}

function SupplierPanel({ suppliers, onCall }: { suppliers: SupplierView[]; onCall: (action: () => Promise<unknown>) => Promise<void> }) {
  const [open, setOpen] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void onCall(() =>
      api('/api/oem', {
        method: 'POST',
        body: {
          name: form.get('name'),
          country: form.get('country') || null,
          contactName: form.get('contactName') || null,
          email: form.get('email') || null,
          moq: form.get('moq') ? Number(form.get('moq')) : null,
          leadTimeDays: form.get('leadTimeDays') ? Number(form.get('leadTimeDays')) : null,
          rating: form.get('rating') ? Number(form.get('rating')) : null,
          note: form.get('note') || null,
        },
      }),
    ).then(() => setOpen(false))
  }

  return (
    <Card>
      <CardHeader
        title={`OEM会社(${suppliers.length})`}
        description="組織で共有されるOEM会社台帳です。"
        action={
          <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? '閉じる' : '+ 会社を登録'}
          </Button>
        }
      />
      <CardBody className="space-y-3">
        {open ? (
          <form onSubmit={submit} className="grid gap-3 border border-line bg-canvas p-4 sm:grid-cols-2">
            <Field label="会社名" required className="sm:col-span-2">
              <Input name="name" required maxLength={160} />
            </Field>
            <Field label="国">
              <Input name="country" placeholder="中国" />
            </Field>
            <Field label="担当者">
              <Input name="contactName" />
            </Field>
            <Field label="メール">
              <Input name="email" type="email" />
            </Field>
            <Field label="評価(0〜5)">
              <Input name="rating" type="number" min={0} max={5} step={0.5} />
            </Field>
            <Field label="標準MOQ">
              <Input name="moq" type="number" min={0} />
            </Field>
            <Field label="標準納期(日)">
              <Input name="leadTimeDays" type="number" min={0} />
            </Field>
            <Field label="備考" className="sm:col-span-2">
              <Textarea name="note" rows={2} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">登録する</Button>
            </div>
          </form>
        ) : null}

        {suppliers.length === 0 && !open ? (
          <p className="py-6 text-center text-[13px] text-ink-muted">OEM会社が未登録です。</p>
        ) : (
          <ul className="space-y-2">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className=" border border-line px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold">{supplier.name}</p>
                  {supplier.rating !== null ? <span className="text-[12px] text-caution">★{supplier.rating.toFixed(1)}</span> : null}
                </div>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {[supplier.country, supplier.contactName, supplier.email].filter(Boolean).join(' / ') || '詳細未登録'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function QuotePanel({
  projectId,
  suppliers,
  quotes,
  onCall,
}: {
  projectId: string
  suppliers: SupplierView[]
  quotes: QuoteView[]
  onCall: (action: () => Promise<unknown>) => Promise<void>
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const num = (key: string) => (form.get(key) ? Number(form.get(key)) : null)
    void onCall(() =>
      api('/api/oem/quotes', {
        method: 'POST',
        body: {
          projectId,
          supplierId: form.get('supplierId'),
          status: 'RECEIVED',
          unitPrice: num('unitPrice'),
          moq: num('moq'),
          sampleCost: num('sampleCost'),
          shippingCost: num('shippingCost'),
          toolingCost: num('toolingCost'),
          leadTimeDays: num('leadTimeDays'),
        },
      }),
    )
  }

  return (
    <Card>
      <CardHeader title="見積の入力" description="OEMごとの見積金額・MOQ・サンプル費・送料・納期を保存します。" />
      <CardBody className="space-y-4">
        {suppliers.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-ink-muted">先にOEM会社を登録してください。</p>
        ) : (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label="OEM会社" required className="sm:col-span-2">
              <Select name="supplierId" required defaultValue="">
                <option value="" disabled>
                  選択してください
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="見積単価(円)">
              <Input name="unitPrice" type="number" min={0} />
            </Field>
            <Field label="MOQ(個)">
              <Input name="moq" type="number" min={0} />
            </Field>
            <Field label="サンプル費(円)">
              <Input name="sampleCost" type="number" min={0} />
            </Field>
            <Field label="送料(円)">
              <Input name="shippingCost" type="number" min={0} />
            </Field>
            <Field label="金型費(円)">
              <Input name="toolingCost" type="number" min={0} />
            </Field>
            <Field label="納期(日)">
              <Input name="leadTimeDays" type="number" min={0} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                見積を保存
              </Button>
            </div>
          </form>
        )}

        {quotes.length > 0 ? (
          <ul className="space-y-2 border-t border-line pt-4">
            {quotes.map((quote) => (
              <li key={quote.id} className="flex items-center justify-between gap-3 border border-line px-4 py-2.5">
                <div>
                  <p className="text-[13px] font-semibold">{quote.supplierName}</p>
                  <p className="text-[12px] text-ink-muted">
                    単価 {formatCurrency(quote.unitPrice)} / MOQ {formatNumber(quote.moq)} / 納期{' '}
                    {quote.leadTimeDays === null ? '—' : `${quote.leadTimeDays}日`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onCall(() => api('/api/oem/quotes', { method: 'DELETE', body: { projectId, quoteId: quote.id } }))}
                >
                  削除
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  )
}
