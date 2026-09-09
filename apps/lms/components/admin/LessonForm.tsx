'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { FormMessage } from '@/components/ui/FormMessage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Markdown } from '@/components/ui/Markdown'
import { toast } from '@/components/ui/Toaster'
import { FileUpload } from '@/components/admin/FileUpload'
import { LESSON_TYPE_LABEL } from '@/components/admin/CourseOutline'
import { addAttachment, removeAttachment, updateLesson } from '@/lib/actions/admin/courses'
import type { Lesson } from '@/lib/db/schema'

type LessonType = Lesson['type']
type Attachment = { id: string; fileName: string; sizeBytes: number | null }

function formatBytes(n: number | null) {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** ADM-02: レッスン編集フォーム（タイプ別入力 + 添付ファイル） */
export function LessonForm({ lesson, attachments: initialAttachments }: { lesson: Lesson; attachments: Attachment[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<LessonType>(lesson.type)
  const [youtube, setYoutube] = useState(lesson.youtubeVideoId ?? '')
  const [slideUrl, setSlideUrl] = useState(lesson.slideUrl ?? '')
  const [bodyMd, setBodyMd] = useState(lesson.bodyMd ?? '')
  const [attachments, setAttachments] = useState(initialAttachments)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const durationRaw = String(fd.get('durationMin') ?? '')
    setError(null)
    start(async () => {
      const res = await updateLesson(lesson.id, {
        title: String(fd.get('title') ?? ''),
        type,
        youtubeVideoId: youtube || null,
        slideUrl: slideUrl || null,
        bodyMd: bodyMd || null,
        durationMin: durationRaw === '' ? null : Number(durationRaw),
      })
      if (!res.ok) return setError(res.error)
      toast('保存しました。')
      router.refresh()
    })
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[1fr_160px_120px]">
          <Field label="レッスン名" htmlFor="title">
            <Input id="title" name="title" required maxLength={120} defaultValue={lesson.title} />
          </Field>
          <Field label="種類" htmlFor="type">
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as LessonType)}>
              {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((t) => (
                <option key={t} value={t}>{LESSON_TYPE_LABEL[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="所要時間（分）" htmlFor="durationMin">
            <Input id="durationMin" name="durationMin" type="number" min={0} max={600} defaultValue={lesson.durationMin ?? ''} className="tnum" />
          </Field>
        </div>

        {type === 'video' && (
          <Field label="YouTube 動画 URL または ID" htmlFor="youtube" hint="URL を貼り付けると 11 文字の動画 ID を自動で取り出します。">
            <Input id="youtube" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="font-mono" />
          </Field>
        )}

        {type === 'slide' && (
          <div className="space-y-1">
            <p className="ui-label text-stone-500">スライド（PDF）</p>
            <div className="flex flex-wrap items-center gap-3">
              <FileUpload accept="application/pdf,.pdf" label="PDF を選択" onUploaded={(f) => setSlideUrl(f.path)} />
              {slideUrl ? (
                <>
                  <span className="caption break-all font-mono">{slideUrl}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSlideUrl('')}>削除</Button>
                </>
              ) : (
                <span className="caption">未設定</span>
              )}
            </div>
            <p className="caption">アップロード後に「保存」を押すと反映されます。</p>
          </div>
        )}

        {type === 'quiz' && <p className="caption">小テストの問題は下の「小テスト」欄で編集します。</p>}

        <Tabs defaultValue="edit">
          <div className="flex items-end justify-between">
            <p className="ui-label text-stone-500">{type === 'text' ? '本文（Markdown）' : '説明（Markdown・任意）'}</p>
            <TabsList className="border-b-0">
              <TabsTrigger value="edit">編集</TabsTrigger>
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="edit" className="pt-2">
            <Textarea value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} className={type === 'text' ? 'min-h-[400px] font-mono text-[13px]' : 'min-h-[160px] font-mono text-[13px]'} maxLength={100_000} />
          </TabsContent>
          <TabsContent value="preview" className="pt-2">
            <div className="min-h-[160px] rounded border bg-paper-200 p-6">
              {bodyMd.trim() ? <Markdown>{bodyMd}</Markdown> : <p className="caption">本文がありません。</p>}
            </div>
          </TabsContent>
        </Tabs>

        <FormMessage message={error} />
        <Button type="submit" disabled={pending}>{pending ? '保存中…' : '保存'}</Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-[18px]">添付ファイル</h2>
        {attachments.length > 0 ? (
          <ul className="divide-y border-y">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate font-sans text-[13px]">{a.fileName}</span>
                <span className="caption tnum shrink-0">{formatBytes(a.sizeBytes)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="添付を削除"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await removeAttachment(a.id)
                      if (!res.ok) return toast(res.error)
                      setAttachments((s) => s.filter((x) => x.id !== a.id))
                      toast('削除しました。')
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="caption">添付ファイルはありません。</p>
        )}
        <FileUpload
          label="ファイルを追加"
          onUploaded={async (f) => {
            const res = await addAttachment(lesson.id, { fileName: f.fileName, storagePath: f.path, sizeBytes: f.sizeBytes })
            if (!res.ok) return toast(res.error)
            setAttachments((s) => [...s, { id: res.data.id, fileName: f.fileName, sizeBytes: f.sizeBytes }])
            toast('添付を追加しました。')
          }}
        />
      </section>
    </div>
  )
}
