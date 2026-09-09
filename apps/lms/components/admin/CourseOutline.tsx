'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'
import { SortableList } from '@/components/admin/SortableList'
import {
  createLesson,
  createSection,
  deleteLesson,
  deleteSection,
  reorderLessons,
  reorderSections,
  updateSection,
} from '@/lib/actions/admin/courses'
import type { Lesson, Section } from '@/lib/db/schema'

export const LESSON_TYPE_LABEL = { video: '動画', slide: 'スライド', text: 'テキスト', quiz: '小テスト' } as const
type LessonType = keyof typeof LESSON_TYPE_LABEL

type SectionWithLessons = Section & { lessons: Lesson[] }

/** ADM-02: セクション / レッスンのアウトライン編集（DnD + 上下ボタン） */
export function CourseOutline({ courseId, initial }: { courseId: string; initial: SectionWithLessons[] }) {
  const router = useRouter()
  const [sections, setSections] = useState(initial)
  const [pending, start] = useTransition()
  const [newSectionTitle, setNewSectionTitle] = useState('')

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) {
        toast(res.error ?? '処理に失敗しました。')
        router.refresh()
        return
      }
      if (success) toast(success)
      router.refresh()
    })

  const addSection = () => {
    const title = newSectionTitle.trim()
    if (!title) return
    start(async () => {
      const res = await createSection(courseId, title)
      if (!res.ok) return toast(res.error)
      setSections((s) => [...s, { ...res.data, lessons: [] }])
      setNewSectionTitle('')
      toast('セクションを追加しました。')
    })
  }

  const onReorderSections = (ids: string[]) => {
    setSections((s) => ids.map((id) => s.find((x) => x.id === id)).filter((x): x is SectionWithLessons => !!x))
    run(() => reorderSections(courseId, ids))
  }

  const onReorderLessons = (sectionId: string, ids: string[]) => {
    setSections((s) =>
      s.map((sec) => (sec.id === sectionId ? { ...sec, lessons: ids.map((id) => sec.lessons.find((l) => l.id === id)).filter((l): l is Lesson => !!l) } : sec)),
    )
    run(() => reorderLessons(sectionId, ids))
  }

  return (
    <div className="space-y-6">
      <SortableList
        items={sections}
        group="sections"
        disabled={pending}
        onReorder={onReorderSections}
        itemClassName="items-start bg-paper-200 py-3"
        renderItem={(sec) => (
          <SectionBlock
            section={sec}
            courseId={courseId}
            pending={pending}
            onRename={(title) => {
              setSections((s) => s.map((x) => (x.id === sec.id ? { ...x, title } : x)))
              run(() => updateSection(sec.id, title), '保存しました。')
            }}
            onDelete={() => {
              if (!confirm(`セクション「${sec.title}」とその中のレッスンを削除します。よろしいですか？`)) return
              setSections((s) => s.filter((x) => x.id !== sec.id))
              run(() => deleteSection(sec.id), '削除しました。')
            }}
            onAddLesson={(title, type) =>
              start(async () => {
                const res = await createLesson(sec.id, { title, type })
                if (!res.ok) return toast(res.error)
                setSections((s) => s.map((x) => (x.id === sec.id ? { ...x, lessons: [...x.lessons, res.data] } : x)))
                toast('レッスンを追加しました。')
                router.refresh()
              })
            }
            onDeleteLesson={(lesson) => {
              if (!confirm(`レッスン「${lesson.title}」を削除します。よろしいですか？`)) return
              setSections((s) => s.map((x) => (x.id === sec.id ? { ...x, lessons: x.lessons.filter((l) => l.id !== lesson.id) } : x)))
              run(() => deleteLesson(lesson.id), '削除しました。')
            }}
            onReorderLessons={(ids) => onReorderLessons(sec.id, ids)}
          />
        )}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          addSection()
        }}
        className="flex items-center gap-2"
      >
        <Input value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} placeholder="新しいセクション名" maxLength={120} className="h-9 max-w-xs" aria-label="新しいセクション名" />
        <Button type="submit" variant="outline" size="sm" disabled={pending || !newSectionTitle.trim()}>
          <Plus /> セクションを追加
        </Button>
      </form>
    </div>
  )
}

function SectionBlock({
  section,
  courseId,
  pending,
  onRename,
  onDelete,
  onAddLesson,
  onDeleteLesson,
  onReorderLessons,
}: {
  section: SectionWithLessons
  courseId: string
  pending: boolean
  onRename: (title: string) => void
  onDelete: () => void
  onAddLesson: (title: string, type: LessonType) => void
  onDeleteLesson: (lesson: Lesson) => void
  onReorderLessons: (ids: string[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(section.title)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonType, setLessonType] = useState<LessonType>('video')

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {editing ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (title.trim()) onRename(title.trim())
              setEditing(false)
            }}
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" autoFocus aria-label="セクション名" />
            <Button type="submit" size="sm">保存</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setTitle(section.title); setEditing(false) }}>取消</Button>
          </form>
        ) : (
          <>
            <h3 className="flex-1 font-serif text-[16px] font-medium">{section.title}</h3>
            <Button type="button" variant="ghost" size="icon" aria-label="セクション名を変更" onClick={() => setEditing(true)}>
              <Pencil />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="セクションを削除" disabled={pending} onClick={onDelete}>
              <Trash2 />
            </Button>
          </>
        )}
      </div>

      {section.lessons.length > 0 ? (
        <SortableList
          items={section.lessons}
          group={`lessons-${section.id}`}
          disabled={pending}
          onReorder={onReorderLessons}
          itemClassName="py-1.5"
          renderItem={(l) => (
            <div className="flex items-center gap-3">
              <Badge variant="muted">{LESSON_TYPE_LABEL[l.type]}</Badge>
              <Link href={`/admin/courses/${courseId}/lessons/${l.id}`} className="min-w-0 flex-1 truncate font-sans text-[13px] no-underline hover:text-bronze-500">
                {l.title}
              </Link>
              {l.durationMin != null && <span className="caption tnum shrink-0">{l.durationMin} 分</span>}
              <Button type="button" variant="ghost" size="icon" aria-label="レッスンを削除" disabled={pending} onClick={() => onDeleteLesson(l)}>
                <Trash2 />
              </Button>
            </div>
          )}
        />
      ) : (
        <p className="caption">レッスンはまだありません。</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const t = lessonTitle.trim()
          if (!t) return
          onAddLesson(t, lessonType)
          setLessonTitle('')
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <Select value={lessonType} onChange={(e) => setLessonType(e.target.value as LessonType)} className="h-9 w-32 text-[13px]" aria-label="レッスンの種類">
          {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((t) => (
            <option key={t} value={t}>{LESSON_TYPE_LABEL[t]}</option>
          ))}
        </Select>
        <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="新しいレッスン名" maxLength={120} className="h-9 max-w-xs" aria-label="新しいレッスン名" />
        <Button type="submit" variant="ghost" size="sm" disabled={pending || !lessonTitle.trim()}>
          <Plus /> レッスンを追加
        </Button>
      </form>
    </div>
  )
}
