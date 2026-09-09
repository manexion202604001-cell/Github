'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { FormMessage } from '@/components/ui/FormMessage'
import { toast } from '@/components/ui/Toaster'
import { FileUpload } from '@/components/admin/FileUpload'
import { createCourse, updateCourse } from '@/lib/actions/admin/courses'
import { LEVEL_LABEL } from '@/lib/utils'
import type { Course } from '@/lib/db/schema'

type Category = { id: string; name: string }

/** ADM-01: コース基本情報フォーム（新規 / 編集） */
export function CourseForm({ course, categories }: { course?: Course; categories: Category[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isSequential, setIsSequential] = useState(course?.isSequential ?? false)
  const [thumbnail, setThumbnail] = useState<string>(course?.thumbnailUrl ?? '')

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input = {
      title: String(fd.get('title') ?? ''),
      slug: String(fd.get('slug') ?? ''),
      description: String(fd.get('description') ?? ''),
      goals: String(fd.get('goals') ?? ''),
      categoryId: String(fd.get('categoryId') ?? '') || null,
      level: String(fd.get('level') ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced',
      thumbnailUrl: thumbnail || null,
      durationWeeks: Number(fd.get('durationWeeks') ?? 2),
      isSequential,
    }
    setError(null)
    start(async () => {
      if (course) {
        const res = await updateCourse(course.id, input)
        if (!res.ok) return setError(res.error)
        toast('保存しました。')
        router.refresh()
      } else {
        const res = await createCourse(input)
        if (!res.ok) return setError(res.error)
        toast('コースを作成しました。')
        router.push(`/admin/courses/${res.data.id}`)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Field label="タイトル" htmlFor="title">
        <Input id="title" name="title" required maxLength={120} defaultValue={course?.title ?? ''} />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="slug（URL）" htmlFor="slug" hint="空欄ならタイトルから自動生成します。英小文字・数字・ハイフン。">
          <Input id="slug" name="slug" pattern="[a-z0-9-]*" maxLength={60} defaultValue={course?.slug ?? ''} className="font-mono" />
        </Field>
        <Field label="カテゴリ" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" defaultValue={course?.categoryId ?? ''}>
            <option value="">未設定</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="難易度" htmlFor="level">
          <Select id="level" name="level" defaultValue={course?.level ?? 'beginner'}>
            {(Object.keys(LEVEL_LABEL) as (keyof typeof LEVEL_LABEL)[]).map((k) => (
              <option key={k} value={k}>{LEVEL_LABEL[k]}</option>
            ))}
          </Select>
        </Field>
        <Field label="想定期間（週）" htmlFor="durationWeeks">
          <Input id="durationWeeks" name="durationWeeks" type="number" min={1} max={52} defaultValue={course?.durationWeeks ?? 2} className="tnum" />
        </Field>
      </div>
      <Field label="説明" htmlFor="description">
        <Textarea id="description" name="description" maxLength={5000} defaultValue={course?.description ?? ''} />
      </Field>
      <Field label="到達目標" htmlFor="goals" hint="1 行につき 1 項目。">
        <Textarea id="goals" name="goals" defaultValue={(course?.goals ?? []).join('\n')} className="min-h-[100px]" />
      </Field>
      <div className="space-y-1">
        <p className="ui-label text-stone-500">サムネイル</p>
        <div className="flex flex-wrap items-center gap-3">
          <FileUpload accept="image/png,image/jpeg,image/webp" label="画像を選択" onUploaded={(f) => setThumbnail(f.path)} />
          {thumbnail ? (
            <>
              <span className="caption break-all font-mono">{thumbnail}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setThumbnail('')}>削除</Button>
            </>
          ) : (
            <span className="caption">未設定</span>
          )}
        </div>
      </div>
      <label className="flex items-center gap-3 font-sans text-[13px] text-ink-700">
        <Switch checked={isSequential} onCheckedChange={setIsSequential} />
        順番受講（前のレッスンを完了しないと次に進めない）
      </label>
      <FormMessage message={error} />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : course ? '保存' : 'コースを作成'}
        </Button>
      </div>
    </form>
  )
}
