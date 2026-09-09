'use client'
import { useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

/**
 * AUTH-04: アバター画像（/api/upload kind=avatar、2MB 以下）。
 * 公開 URL を hidden input `avatarUrl` に入れてフォームで送信する。
 */
export function AvatarUpload({ name, initialUrl }: { name: string; initialUrl: string | null }) {
  const [url, setUrl] = useState<string>(initialUrl ?? '')
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('kind', 'avatar')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = (await res.json()) as { url?: string | null; error?: string }
      if (!res.ok || !json.url) {
        toast(json.error ?? 'アップロードに失敗しました。')
        return
      }
      setUrl(json.url)
      setPreview(URL.createObjectURL(file))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={url} />
      <span className="inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-300 bg-paper-200">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- ローカルプレビュー(blob URL) / 公開 URL
          <img src={preview} alt="" className="size-full object-cover" style={{ filter: 'saturate(0.7)' }} />
        ) : (
          <Avatar name={name} size={64} className="border-0" />
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" id="avatar-file" onChange={(e) => upload(e.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'アップロード中…' : '画像を選ぶ'}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setUrl('')
              setPreview(null)
            }}
          >
            削除
          </Button>
        )}
      </div>
    </div>
  )
}
