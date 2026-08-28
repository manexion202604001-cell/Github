'use client'

import { useActionState, useEffect, useState } from 'react'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteProductAction, saveProductAction } from '@/features/brands/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/field'
import { TagInput } from '@/components/ui/tag-input'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'

import type { ActionResult } from '@/lib/errors'

export type ProductData = {
  id: string
  name: string
  description: string | null
  priceRange: string | null
  strengths: string[]
  weaknesses: string[]
  differentiation: string | null
  customerProblems: string[]
  customerNeeds: string[]
  purchaseReasons: string[]
}

/** 商品・サービス(要件11, 55)。 */
export function ProductPanel({ brandId, products }: { brandId: string; products: ProductData[] }) {
  const [editing, setEditing] = useState<ProductData | 'new' | null>(null)
  const [, deleteAction] = useActionState<ActionResult | null, FormData>(deleteProductAction, null)

  return (
    <Card>
      <CardHeader
        icon={<Package className="h-4 w-4" />}
        title="商品・サービス"
        description="強みと顧客の悩みが具体的なほど、企画の精度が上がります。"
        action={
          <Button variant="secondary" size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            追加
          </Button>
        }
      />
      <CardBody className="space-y-3">
        {products.length === 0 ? (
          <p className="text-[13px] text-ink-muted">まだ商品・サービスが登録されていません。</p>
        ) : (
          products.map((product) => (
            <div key={product.id} className="rounded-[14px] border border-line px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-navy">{product.name}</p>
                  {product.priceRange ? <p className="mt-0.5 text-[12px] text-ink-muted">価格帯: {product.priceRange}</p> : null}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(product)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    編集
                  </Button>
                  <form
                    action={(form) => {
                      form.set('brandId', brandId)
                      form.set('productId', product.id)
                      deleteAction(form)
                    }}
                  >
                    <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger-wash hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      削除
                    </Button>
                  </form>
                </div>
              </div>

              {product.description ? <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{product.description}</p> : null}

              <div className="mt-3 space-y-2">
                <TagRow label="強み" values={product.strengths} tone="positive" />
                <TagRow label="顧客の悩み" values={product.customerProblems} tone="warning" />
                <TagRow label="購入理由" values={product.purchaseReasons} tone="brand" />
              </div>
            </div>
          ))
        )}
      </CardBody>

      <ProductDialog
        brandId={brandId}
        product={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </Card>
  )
}

function TagRow({ label, values, tone }: { label: string; values: string[]; tone: 'positive' | 'warning' | 'brand' }) {
  if (values.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold text-ink-subtle">{label}</span>
      {values.map((value) => (
        <Badge key={value} tone={tone}>
          {value}
        </Badge>
      ))}
    </div>
  )
}

function ProductDialog({
  brandId,
  product,
  open,
  onClose,
}: {
  brandId: string
  product: ProductData | null
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(saveProductAction, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success('商品情報を保存しました。')
      onClose()
    }
  }, [state, toast, onClose])

  return (
    <Dialog open={open} onClose={onClose} title={product ? '商品・サービスを編集' : '商品・サービスを追加'} size="lg">
      {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

      <form action={action} className="space-y-4" key={product?.id ?? 'new'}>
        <input type="hidden" name="brandId" value={brandId} />
        {product ? <input type="hidden" name="productId" value={product.id} /> : null}

        <Field label="商品・サービス名" htmlFor="product-name" required>
          <Input id="product-name" name="name" defaultValue={product?.name ?? ''} required />
        </Field>
        <Field label="商品概要" htmlFor="product-description">
          <Textarea id="product-description" name="description" defaultValue={product?.description ?? ''} rows={3} />
        </Field>
        <Field label="価格帯" htmlFor="product-price">
          <Input id="product-price" name="priceRange" defaultValue={product?.priceRange ?? ''} />
        </Field>
        <Field label="強み・特徴">
          <TagInput name="strengths" defaultValue={product?.strengths ?? []} />
        </Field>
        <Field label="弱み">
          <TagInput name="weaknesses" defaultValue={product?.weaknesses ?? []} />
        </Field>
        <Field label="差別化ポイント" htmlFor="product-diff">
          <Textarea id="product-diff" name="differentiation" defaultValue={product?.differentiation ?? ''} rows={2} />
        </Field>
        <Field label="顧客の悩み">
          <TagInput name="customerProblems" defaultValue={product?.customerProblems ?? []} />
        </Field>
        <Field label="顧客のニーズ">
          <TagInput name="customerNeeds" defaultValue={product?.customerNeeds ?? []} />
        </Field>
        <Field label="購入理由">
          <TagInput name="purchaseReasons" defaultValue={product?.purchaseReasons ?? []} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <SubmitButton>保存する</SubmitButton>
        </div>
      </form>
    </Dialog>
  )
}
