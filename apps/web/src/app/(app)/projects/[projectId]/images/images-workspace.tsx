'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Notice, Progress } from '@/components/ui/feedback'
import { Field, Input, Select } from '@/components/ui/field'
import { Viewer360 } from './viewer-360'
import { CONCEPT_DIRECTIONS, EDIT_PRESETS, IMAGE_PRESETS } from '@/prompts/image-prompts'

type ImageView = {
  id: string
  url: string
  type: string
  angle: string | null
  variant: string | null
  isAnchor: boolean
  prompt: string | null
}

export function ImagesWorkspace({
  projectId,
  synthetic,
  concepts,
  anchor,
  angles,
  others,
}: {
  projectId: string
  synthetic: boolean
  concepts: ImageView[]
  anchor: ImageView | null
  angles: ImageView[]
  others: ImageView[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const job = useJob((finished) => {
    if (finished.status === 'FAILED') setError(finished.error ?? '生成に失敗しました')
    router.refresh()
  })

  const run = async (path: string, body: unknown) => {
    setError(null)
    try {
      const result = await api<{ jobId: string }>(path, { method: 'POST', body })
      job.track(result.jobId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '開始に失敗しました')
    }
  }

  const selectAnchor = async (imageId: string) => {
    setError(null)
    try {
      await api('/api/images/generate', { method: 'PUT', body: { projectId, imageId } })
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'アンカー画像の選択に失敗しました')
    }
  }

  return (
    <div className="space-y-5">
      {synthetic ? (
        <Notice tone="warning" title="画像生成Providerが未設定です">
          現在はサンプルのモックアップ画像が生成されます。実際のAI画像を生成するには IMAGE_PROVIDER とAPIキーを設定してください。
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {job.running && job.job ? (
        <Card>
          <CardBody className="space-y-2">
            <p className="text-[13px] font-semibold">画像を生成しています…</p>
            <Progress value={job.job.progress} showValue />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="コンセプト3案"
          description="A: 売れ筋重視 / B: 高級感重視 / C: 差別化重視。1案を選ぶとアンカー画像として以降の生成基準になります。"
          action={
            <Button
              variant="secondary"
              onClick={() => void run('/api/images/generate', { projectId })}
              disabled={job.running}
            >
              {concepts.length > 0 ? '3案を再生成' : '3案を生成'}
            </Button>
          }
        />
        <CardBody>
          {concepts.length === 0 ? (
            <EmptyState
              title="まだコンセプト画像がありません"
              description="商品概要を入力したら、まず3つのデザイン方向を可視化しましょう。"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {concepts.map((image) => {
                const direction = CONCEPT_DIRECTIONS.find((item) => item.variant === image.variant)
                return (
                  <div
                    key={image.id}
                    className={cn(
                      'overflow-hidden border bg-white',
                      image.isAnchor ? 'border-brand ring-2 ring-brand/30' : 'border-line',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={direction?.label ?? image.variant ?? ''} className="aspect-square w-full object-contain" />
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold">
                          {image.variant} — {direction?.label ?? 'コンセプト'}
                        </p>
                        {image.isAnchor ? <Badge tone="brand">アンカー</Badge> : null}
                      </div>
                      <Button
                        size="sm"
                        variant={image.isAnchor ? 'secondary' : 'primary'}
                        className="w-full"
                        onClick={() => void selectAnchor(image.id)}
                        disabled={image.isAnchor}
                      >
                        {image.isAnchor ? '選択済み' : 'この案を選ぶ'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="360度商品ビュー(8方向)"
          description="アンカー画像を基準に8方向を生成し、回転ビューで確認できます。"
          action={
            <Button
              variant="secondary"
              onClick={() => void run('/api/images/multi-angle', { projectId })}
              disabled={job.running || !anchor}
            >
              {angles.length > 0 ? '8方向を再生成' : '8方向を生成'}
            </Button>
          }
        />
        <CardBody>
          {!anchor ? (
            <EmptyState title="先にアンカー画像を選択してください" description="コンセプト3案から1つを選ぶと生成できます。" />
          ) : angles.length === 0 ? (
            <EmptyState title="まだ角度画像がありません" description="「8方向を生成」を押すと360度ビューが作成されます。" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Viewer360 images={angles.map((image) => ({ url: image.url, angle: image.angle }))} />
              <div className="grid grid-cols-4 gap-2 self-start">
                {angles.map((image) => (
                  <div key={image.id} className="overflow-hidden border border-line bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.angle ?? ''} className="aspect-square w-full object-contain" />
                    <p className="border-t border-line px-1 py-0.5 text-center text-[10px] text-ink-subtle">{image.angle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <MarketingImages projectId={projectId} others={others} disabled={job.running} onRun={run} />
      <ImageEditor projectId={projectId} images={[...concepts, ...(anchor ? [anchor] : []), ...others]} disabled={job.running} onRun={run} />
    </div>
  )
}

function MarketingImages({
  projectId,
  others,
  disabled,
  onRun,
}: {
  projectId: string
  others: ImageView[]
  disabled: boolean
  onRun: (path: string, body: unknown) => Promise<void>
}) {
  const [presetId, setPresetId] = useState(IMAGE_PRESETS[0]?.id ?? 'PRODUCT_ONLY')
  const preset = IMAGE_PRESETS.find((item) => item.id === presetId)

  return (
    <Card>
      <CardHeader title="商品画像の種類" description="用途別の商品画像を生成します(白背景 / 使用シーン / Amazonメイン画像など)。" />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="画像の種類" className="min-w-56">
            <Select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
              {IMAGE_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — {item.description}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void onRun('/api/images/generate', { projectId, presetId })}
          >
            生成する
          </Button>
        </div>
        {preset ? <p className="text-[12px] text-ink-subtle">{preset.description}(比率 {preset.aspectRatio})</p> : null}
        {others.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {others.map((image) => (
              <div key={image.id} className="overflow-hidden border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.type} className="aspect-square w-full object-contain" />
                <p className="border-t border-line px-2 py-1 text-center text-[11px] text-ink-subtle">{image.type}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}

function ImageEditor({
  projectId,
  images,
  disabled,
  onRun,
}: {
  projectId: string
  images: ImageView[]
  disabled: boolean
  onRun: (path: string, body: unknown) => Promise<void>
}) {
  const [imageId, setImageId] = useState('')
  const [presetId, setPresetId] = useState(EDIT_PRESETS[0]?.id ?? 'color')
  const [value, setValue] = useState('')

  if (images.length === 0) return null

  return (
    <Card>
      <CardHeader
        title="商品画像編集"
        description="色変更・素材変更・パーツ追加・背景変更などを指示できます。元画像は残り、新しい画像として保存されます。"
      />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="対象画像">
            <Select value={imageId} onChange={(event) => setImageId(event.target.value)}>
              <option value="">選択してください</option>
              {images.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.type}
                  {image.variant ? ` (${image.variant})` : ''}
                  {image.isAnchor ? ' ★アンカー' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="編集の種類">
            <Select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
              {EDIT_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="内容">
            <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="例: マットなネイビー" />
          </Field>
        </div>
        <Button
          variant="secondary"
          disabled={disabled || !imageId || value.trim() === ''}
          onClick={() => void onRun('/api/images/edit', { projectId, imageId, presetId, value })}
        >
          編集画像を生成
        </Button>
      </CardBody>
    </Card>
  )
}
