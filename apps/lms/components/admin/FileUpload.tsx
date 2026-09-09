'use client'
import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

export type UploadedFile = { path: string; fileName: string; sizeBytes: number }

/**
 * 教材ファイルのアップロード（/api/upload kind=lesson-file → lesson-files バケット）。
 * XHR で進捗を表示し、完了時に保存パスを onUploaded で返す。
 */
export function FileUpload({
  accept,
  label = 'ファイルを選択',
  onUploaded,
  disabled,
}: {
  accept?: string
  label?: string
  onUploaded: (file: UploadedFile) => void | Promise<void>
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const upload = (file: File) => {
    setProgress(0)
    const fd = new FormData()
    fd.set('file', file)
    fd.set('kind', 'lesson-file')
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = async () => {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
      let json: { path?: string; fileName?: string; sizeBytes?: number; error?: string } = {}
      try {
        json = JSON.parse(xhr.responseText) as typeof json
      } catch {
        /* noop */
      }
      if (xhr.status >= 400 || !json.path) {
        toast(json.error ?? 'アップロードに失敗しました。')
        return
      }
      await onUploaded({ path: json.path, fileName: json.fileName ?? file.name, sizeBytes: json.sizeBytes ?? file.size })
    }
    xhr.onerror = () => {
      setProgress(null)
      toast('アップロードに失敗しました。')
    }
    xhr.send(fd)
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled || progress !== null} onClick={() => inputRef.current?.click()}>
        <Upload />
        {progress === null ? label : `アップロード中… ${progress}%`}
      </Button>
      {progress !== null && (
        <div className="h-[2px] w-32 overflow-hidden rounded bg-stone-300/30" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-bronze-500 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
