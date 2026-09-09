'use client'
import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

export type UploadedImage = { path: string; previewUrl: string }

/**
 * 画像添付（/api/upload kind=image）。max 枚まで。各 5MB。
 * 保存パスは hidden input `name` で送信される（JSON 配列）
 */
export function ImageUploader({ name, max = 3, value, onChange }: { name?: string; max?: number; value?: UploadedImage[]; onChange?: (v: UploadedImage[]) => void }) {
  const [internal, setInternal] = useState<UploadedImage[]>([])
  const images = value ?? internal
  const set = (v: UploadedImage[]) => {
    setInternal(v)
    onChange?.(v)
  }
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (files: FileList | null) => {
    if (!files) return
    const room = max - images.length
    const list = Array.from(files).slice(0, room)
    if (list.length === 0) return toast(`画像は ${max} 枚までです。`)
    setBusy(true)
    const added: UploadedImage[] = []
    for (const f of list) {
      const fd = new FormData()
      fd.set('file', f)
      fd.set('kind', 'image')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = (await res.json()) as { path?: string; error?: string }
      if (!res.ok || !json.path) {
        toast(json.error ?? 'アップロードに失敗しました。')
        continue
      }
      added.push({ path: json.path, previewUrl: URL.createObjectURL(f) })
    }
    set([...images, ...added])
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {name && <input type="hidden" name={name} value={JSON.stringify(images.map((i) => i.path))} />}
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((img) => (
            <li key={img.path} className="relative size-20 overflow-hidden rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element -- ローカルプレビュー(blob URL) */}
              <img src={img.previewUrl} alt="" className="size-full object-cover" style={{ filter: 'saturate(0.7)' }} />
              <button type="button" onClick={() => set(images.filter((i) => i.path !== img.path))} className="absolute right-0.5 top-0.5 rounded bg-ink-900/80 p-0.5 text-paper-100" aria-label="削除">
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="sr-only" id={`img-${name ?? 'u'}`} onChange={(e) => upload(e.target.files)} />
      <Button type="button" variant="ghost" size="sm" disabled={busy || images.length >= max} onClick={() => inputRef.current?.click()}>
        <ImagePlus />
        {busy ? 'アップロード中…' : `画像を添付（${images.length}/${max}）`}
      </Button>
    </div>
  )
}
