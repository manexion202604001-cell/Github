'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/hooks/api'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Notice } from '@/components/ui/feedback'
import { JobLauncher } from '@/components/job-launcher'

type SectionView = {
  id: string
  kind: string
  order: number
  title: string | null
  subtitle: string | null
  body: string | null
  items: { label: string; value: string | null }[]
  imageUrl: string | null
  ctaLabel: string | null
  ctaHref: string | null
  visible: boolean
}

type PageView = {
  id: string
  version: number
  title: string
  headline: string | null
  subheadline: string | null
  status: string
  publicSlug: string | null
  sections: SectionView[]
}

const DEVICE_WIDTH = { desktop: '100%', tablet: '768px', mobile: '390px' } as const

const KIND_LABEL: Record<string, string> = {
  HERO: 'ファーストビュー',
  PROBLEM: '問題提起',
  PRODUCT: '商品紹介',
  FEATURES: '特徴',
  BENEFITS: 'ベネフィット',
  HOW_TO_USE: '使用方法',
  COMPARISON: '競合比較',
  REVIEWS: 'レビュー想定',
  FAQ: 'FAQ',
  CTA: 'CTA',
  CUSTOM: 'カスタム',
}

export function LPWorkspace({ projectId, page }: { projectId: string; page: PageView | null }) {
  const router = useRouter()
  const [device, setDevice] = useState<keyof typeof DEVICE_WIDTH>('desktop')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  const patch = async (body: unknown) => {
    setError(null)
    try {
      await api('/api/lp', { method: 'PATCH', body })
      router.refresh()
      setPreviewKey((value) => value + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '更新に失敗しました')
    }
  }

  const move = (section: SectionView, direction: -1 | 1) => {
    if (!page) return
    const ordered = [...page.sections].sort((a, b) => a.order - b.order)
    const index = ordered.findIndex((item) => item.id === section.id)
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const swap = ordered[target]
    if (!swap) return
    ordered[target] = section
    ordered[index] = swap
    void patch({ action: 'reorder', projectId, orderedIds: ordered.map((item) => item.id) })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="AI LP作成"
          description="商品情報・市場分析・競合レビューからLP構成と文言を生成します。生成後は自由に編集できます。"
          action={page ? <Badge tone="brand">v{page.version}</Badge> : undefined}
        />
        <CardBody className="flex flex-wrap items-center gap-3">
          <JobLauncher
            label={page ? 'LPを再生成(新Version)' : 'AIでLPを生成'}
            path="/api/lp/generate"
            body={{ projectId }}
          />
          {page ? (
            <>
              <a href={`/api/lp?projectId=${projectId}&format=html`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">HTMLを開く</Button>
              </a>
              <a href={`/api/lp?projectId=${projectId}`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">JSONを開く</Button>
              </a>
              <PublishControl projectId={projectId} publicSlug={page.publicSlug} status={page.status} />
            </>
          ) : null}
        </CardBody>
      </Card>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {!page ? (
        <EmptyState
          title="LPはまだ生成されていません"
          description="市場調査・商品評価まで進めてから生成すると、レビュー不満を踏まえた構成になります。"
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="self-start">
            <CardHeader title="セクション編集" description="並び替え・非表示・文言修正ができます。" />
            <CardBody className="space-y-2">
              {[...page.sections]
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <div key={section.id} className={cn(' border px-3.5 py-2.5', section.visible ? 'border-line' : 'border-line bg-canvas-alt/60 opacity-60')}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                      >
                        <p className="truncate text-[13px] font-semibold">
                          {KIND_LABEL[section.kind] ?? section.kind}
                          {section.title ? ` — ${section.title}` : ''}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton label="上へ" onClick={() => move(section, -1)}>↑</IconButton>
                        <IconButton label="下へ" onClick={() => move(section, 1)}>↓</IconButton>
                        <IconButton
                          label={section.visible ? '非表示' : '表示'}
                          onClick={() => void patch({ action: 'update-section', projectId, sectionId: section.id, visible: !section.visible })}
                        >
                          {section.visible ? '👁' : '—'}
                        </IconButton>
                        <IconButton
                          label="削除"
                          onClick={() => {
                            if (window.confirm('このセクションを削除しますか?')) {
                              void patch({ action: 'delete-section', projectId, sectionId: section.id })
                            }
                          }}
                        >
                          ×
                        </IconButton>
                      </div>
                    </div>

                    {editingId === section.id ? (
                      <SectionEditor
                        section={section}
                        onSave={(fields) => {
                          void patch({ action: 'update-section', projectId, sectionId: section.id, ...fields })
                          setEditingId(null)
                        }}
                      />
                    ) : null}
                  </div>
                ))}

              <AddSection projectId={projectId} onAdd={(kind) => void patch({ action: 'add-section', projectId, kind })} />
            </CardBody>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="プレビュー"
              action={
                <div className="flex gap-1">
                  {(Object.keys(DEVICE_WIDTH) as (keyof typeof DEVICE_WIDTH)[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDevice(key)}
                      className={cn(
                        ' px-3 py-1 text-[12px] font-semibold',
                        device === key ? 'bg-brand text-white' : 'text-ink-muted hover:bg-canvas-alt',
                      )}
                    >
                      {key === 'desktop' ? 'Desktop' : key === 'tablet' ? 'Tablet' : 'Mobile'}
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody className="bg-canvas-alt/50">
              <div className="mx-auto overflow-hidden border border-line bg-white shadow-sm" style={{ maxWidth: DEVICE_WIDTH[device] }}>
                <iframe
                  key={previewKey}
                  src={`/api/lp?projectId=${projectId}&format=html`}
                  title="LP preview"
                  className="h-[70dvh] w-full"
                />
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center text-[12px] text-ink-muted hover:bg-canvas-alt hover:text-ink"
    >
      {children}
    </button>
  )
}

function SectionEditor({
  section,
  onSave,
}: {
  section: SectionView
  onSave: (fields: { title: string | null; subtitle: string | null; body: string | null; ctaLabel: string | null; items: { label: string; value: string | null }[] }) => void
}) {
  const [title, setTitle] = useState(section.title ?? '')
  const [subtitle, setSubtitle] = useState(section.subtitle ?? '')
  const [body, setBody] = useState(section.body ?? '')
  const [ctaLabel, setCtaLabel] = useState(section.ctaLabel ?? '')
  const [itemsText, setItemsText] = useState(
    section.items.map((item) => (item.value ? `${item.label} | ${item.value}` : item.label)).join('\n'),
  )

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      <Field label="タイトル">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="サブタイトル">
        <Input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
      </Field>
      <Field label="本文">
        <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} />
      </Field>
      <Field label="項目" hint="1行1項目。「ラベル | 内容」の形式">
        <Textarea value={itemsText} onChange={(event) => setItemsText(event.target.value)} rows={3} />
      </Field>
      <Field label="CTAボタン文言">
        <Input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} />
      </Field>
      <Button
        size="sm"
        onClick={() =>
          onSave({
            title: title || null,
            subtitle: subtitle || null,
            body: body || null,
            ctaLabel: ctaLabel || null,
            items: itemsText
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [label, ...rest] = line.split('|')
                return { label: (label ?? '').trim(), value: rest.length > 0 ? rest.join('|').trim() : null }
              }),
          })
        }
      >
        このセクションを保存
      </Button>
    </div>
  )
}

function AddSection({ projectId: _projectId, onAdd }: { projectId: string; onAdd: (kind: string) => void }) {
  const [kind, setKind] = useState('CUSTOM')
  return (
    <div className="flex items-end gap-2 border-t border-line pt-3">
      <Field label="セクションを追加" className="flex-1">
        <Select value={kind} onChange={(event) => setKind(event.target.value)}>
          {Object.entries(KIND_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Button variant="secondary" size="md" onClick={() => onAdd(kind)}>
        追加
      </Button>
    </div>
  )
}


/** 公開URLの発行と表示(要件57 Preview URL)。 */
function PublishControl({
  projectId,
  publicSlug,
  status,
}: {
  projectId: string
  publicSlug: string | null
  status: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const publish = async () => {
    setBusy(true)
    setPublishError(null)
    try {
      await api('/api/lp', { method: 'PATCH', body: { action: 'publish', projectId } })
      router.refresh()
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : '公開に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'PUBLISHED' && publicSlug) {
    const url = `/lp/${publicSlug}`
    return (
      <span className="inline-flex items-center gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">公開ページを開く</Button>
        </a>
        <button
          type="button"
          className="text-[12px] text-ink-subtle underline-offset-2 hover:text-brand hover:underline"
          onClick={() => {
            void navigator.clipboard.writeText(`${window.location.origin}${url}`)
          }}
        >
          URLをコピー
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="secondary" onClick={publish} loading={busy}>
        公開URLを発行
      </Button>
      {publishError ? <span className="text-[12px] text-critical">{publishError}</span> : null}
    </span>
  )
}
