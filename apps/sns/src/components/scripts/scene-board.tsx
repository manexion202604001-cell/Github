'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Camera, Copy, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { reorderScenesAction, saveSceneAction, sceneCommandAction } from '@/features/scripts/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { timecode } from '@/lib/format'
import type { ActionResult } from '@/lib/errors'

export type SceneData = {
  id: string
  position: number
  startSecond: number
  endSecond: number
  visual: string
  voice: string
  onscreenText: string | null
  camera: string | null
  assets: string[]
  purpose: string | null
}

/**
 * Storyboard(要件84)。
 * 文章の羅列ではなく、時間・映像・音声・カメラを並べた制作用の画面にする。
 * Mobileでは各シーンをアコーディオンにする(要件91)。
 */
export function SceneBoard({ scriptId, scenes, totalSeconds }: { scriptId: string; scenes: SceneData[]; totalSeconds: number }) {
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState<SceneData | 'new' | null>(null)
  const [, startTransition] = useTransition()
  const [, commandAction] = useActionState<ActionResult | null, FormData>(sceneCommandAction, null)

  function move(index: number, direction: -1 | 1) {
    const next = index + direction
    if (next < 0 || next >= scenes.length) return
    const ordered = [...scenes]
    const [moved] = ordered.splice(index, 1)
    if (!moved) return
    ordered.splice(next, 0, moved)

    startTransition(async () => {
      const result = await reorderScenesAction(
        scriptId,
        ordered.map((scene) => scene.id),
      )
      if (result.ok) router.refresh()
      else toast.error(result.message, result.hint ?? undefined)
    })
  }

  return (
    <div className="space-y-3">
      {scenes.map((scene, index) => (
        <article
          key={scene.id}
          className="print-block group rounded-[18px] border border-line bg-surface shadow-[0_8px_30px_rgba(15,39,80,0.06)]"
        >
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[92px_minmax(0,1fr)_220px]">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
              <span className="tabular flex h-9 w-9 items-center justify-center rounded-[10px] bg-navy text-[13px] text-white">
                {index + 1}
              </span>
              <div>
                <p className="tabular text-[13px] text-navy">
                  {timecode(scene.startSecond)}–{timecode(scene.endSecond)}
                </p>
                <p className="text-[11px] text-ink-subtle">{scene.endSecond - scene.startSecond}秒</p>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-ink-subtle">VISUAL</p>
                <p className="mt-1 text-[14px] leading-relaxed text-navy">{scene.visual}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-ink-subtle">VOICE / SERIF</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink">{scene.voice || '—'}</p>
              </div>
              {scene.onscreenText ? (
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-ink-subtle">ON SCREEN TEXT</p>
                  <p className="mt-1 inline-block rounded-[8px] bg-navy px-2.5 py-1 text-[13px] font-bold text-white">
                    {scene.onscreenText}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2.5 border-t border-line pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              {scene.purpose ? <Badge tone="brand">{scene.purpose}</Badge> : null}
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-ink-subtle">
                  <Camera className="h-3 w-3" aria-hidden="true" />
                  CAMERA
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{scene.camera ?? '—'}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-ink-subtle">
                  <Package className="h-3 w-3" aria-hidden="true" />
                  ASSET
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{scene.assets.join(' / ') || '—'}</p>
              </div>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-1 border-t border-line px-4 py-2 sm:px-5">
            <IconAction label="上へ移動" onClick={() => move(index, -1)} disabled={index === 0}>
              <ArrowUp className="h-3.5 w-3.5" />
            </IconAction>
            <IconAction label="下へ移動" onClick={() => move(index, 1)} disabled={index === scenes.length - 1}>
              <ArrowDown className="h-3.5 w-3.5" />
            </IconAction>
            <IconAction label="編集" onClick={() => setEditing(scene)}>
              <Pencil className="h-3.5 w-3.5" />
            </IconAction>
            <form
              action={(form) => {
                form.set('scriptId', scriptId)
                form.set('sceneId', scene.id)
                form.set('command', 'duplicate')
                commandAction(form)
              }}
            >
              <IconAction label="複製" type="submit">
                <Copy className="h-3.5 w-3.5" />
              </IconAction>
            </form>
            <form
              className="ml-auto"
              action={(form) => {
                form.set('scriptId', scriptId)
                form.set('sceneId', scene.id)
                form.set('command', 'delete')
                commandAction(form)
              }}
            >
              <IconAction label="削除" type="submit" tone="danger">
                <Trash2 className="h-3.5 w-3.5" />
              </IconAction>
            </form>
          </div>
        </article>
      ))}

      <Button variant="secondary" className="no-print w-full" onClick={() => setEditing('new')}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        シーンを追加
      </Button>

      <SceneDialog
        scriptId={scriptId}
        scene={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        defaultStart={scenes[scenes.length - 1]?.endSecond ?? 0}
        totalSeconds={totalSeconds}
      />
    </div>
  )
}

function IconAction({
  label,
  children,
  onClick,
  disabled,
  type = 'button',
  tone = 'default',
}: {
  label: string
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        tone === 'danger'
          ? 'inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[12px] font-semibold text-danger transition-colors hover:bg-danger-wash disabled:opacity-40'
          : 'inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[12px] font-semibold text-ink-muted transition-colors hover:bg-canvas-alt hover:text-navy disabled:opacity-40'
      }
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function SceneDialog({
  scriptId,
  scene,
  open,
  onClose,
  defaultStart,
  totalSeconds,
}: {
  scriptId: string
  scene: SceneData | null
  open: boolean
  onClose: () => void
  defaultStart: number
  totalSeconds: number
}) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(saveSceneAction, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success('シーンを保存しました。')
      onClose()
    }
  }, [state, toast, onClose])

  return (
    <Dialog open={open} onClose={onClose} title={scene ? `Scene ${scene.position + 1} を編集` : 'シーンを追加'} size="lg">
      {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

      <form action={action} className="space-y-4" key={scene?.id ?? 'new'}>
        <input type="hidden" name="scriptId" value={scriptId} />
        {scene ? <input type="hidden" name="sceneId" value={scene.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="開始(秒)" htmlFor="startSecond" required>
            <Input
              id="startSecond"
              name="startSecond"
              type="number"
              min={0}
              max={totalSeconds}
              defaultValue={scene?.startSecond ?? defaultStart}
              required
            />
          </Field>
          <Field label="終了(秒)" htmlFor="endSecond" required>
            <Input
              id="endSecond"
              name="endSecond"
              type="number"
              min={1}
              max={totalSeconds}
              defaultValue={scene?.endSecond ?? Math.min(totalSeconds, defaultStart + 5)}
              required
            />
          </Field>
        </div>

        <Field label="VISUAL(映像)" htmlFor="visual" required>
          <Textarea id="visual" name="visual" defaultValue={scene?.visual ?? ''} rows={3} required />
        </Field>

        <Field label="VOICE / SERIF(音声)" htmlFor="voice">
          <Textarea id="voice" name="voice" defaultValue={scene?.voice ?? ''} rows={3} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ON SCREEN TEXT(テロップ)" htmlFor="onscreenText" hint="20文字以内が目安です。">
            <Input id="onscreenText" name="onscreenText" defaultValue={scene?.onscreenText ?? ''} maxLength={60} />
          </Field>
          <Field label="CAMERA" htmlFor="camera">
            <Input id="camera" name="camera" defaultValue={scene?.camera ?? ''} placeholder="手持ちミディアム / 寄りのマクロ" />
          </Field>
          <Field label="ASSET(必要素材)" htmlFor="assets" hint="改行またはカンマ区切り">
            <Input id="assets" name="assets" defaultValue={scene?.assets.join(', ') ?? ''} />
          </Field>
          <Field label="PURPOSE(役割)" htmlFor="purpose">
            <Input id="purpose" name="purpose" defaultValue={scene?.purpose ?? ''} placeholder="Hook / Problem / CTA" />
          </Field>
        </div>

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
