'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { FormMessage } from '@/components/ui/FormMessage'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/Toaster'
import { createBadge, deleteBadge, updateBadge } from '@/lib/actions/admin/gamification'
import { parseBadgeCriteria, type BadgeCriteria } from '@/lib/xp'

type BadgeRow = { id: string; slug: string; name: string; description: string | null; icon: string | null; criteria: unknown; sortOrder: number }
type Category = { slug: string; name: string }

const CRITERIA_TYPES: { value: BadgeCriteria['type']; label: string; unit: string }[] = [
  { value: 'lesson_complete', label: 'レッスン完了数', unit: '回' },
  { value: 'course_complete', label: 'コース完了数', unit: 'コース' },
  { value: 'qa_question', label: 'Q&A 質問数', unit: '件' },
  { value: 'community_post', label: 'コミュニティ投稿数', unit: '件' },
  { value: 'office_hour_attend', label: 'オフィスアワー参加数', unit: '回' },
  { value: 'streak', label: '連続学習日数', unit: '日' },
  { value: 'xp_total', label: '累計 XP', unit: 'XP' },
  { value: 'category_complete', label: 'カテゴリ内の全コース完了', unit: '' },
]

export function describeCriteria(raw: unknown, categories: Category[]): string {
  const c = parseBadgeCriteria(raw)
  if (!c) return '（条件不正）'
  const t = CRITERIA_TYPES.find((x) => x.value === c.type)
  switch (c.type) {
    case 'streak':
      return `${t?.label} ${c.days} 日`
    case 'xp_total':
      return `${t?.label} ${c.xp} XP`
    case 'category_complete':
      return `${categories.find((x) => x.slug === c.category)?.name ?? c.category} の全コース完了`
    default:
      return `${t?.label} ${c.count} ${t?.unit ?? ''}`
  }
}

function criteriaToForm(raw: unknown): { type: BadgeCriteria['type']; value: string; category: string } {
  const c = parseBadgeCriteria(raw)
  if (!c) return { type: 'lesson_complete', value: '1', category: '' }
  if (c.type === 'streak') return { type: c.type, value: String(c.days), category: '' }
  if (c.type === 'xp_total') return { type: c.type, value: String(c.xp), category: '' }
  if (c.type === 'category_complete') return { type: c.type, value: '', category: c.category }
  return { type: c.type, value: String(c.count), category: '' }
}

function formToCriteria(f: { type: BadgeCriteria['type']; value: string; category: string }): unknown {
  const n = Number(f.value)
  switch (f.type) {
    case 'streak':
      return { type: f.type, days: n }
    case 'xp_total':
      return { type: f.type, xp: n }
    case 'category_complete':
      return { type: f.type, category: f.category }
    default:
      return { type: f.type, count: n }
  }
}

function BadgeForm({ badge, categories, onDone }: { badge?: BadgeRow; categories: Category[]; onDone: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [crit, setCrit] = useState(() => criteriaToForm(badge?.criteria))
  const type = CRITERIA_TYPES.find((t) => t.value === crit.type)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const input = {
          name: String(fd.get('name') ?? ''),
          slug: String(fd.get('slug') ?? ''),
          description: String(fd.get('description') ?? '') || null,
          icon: String(fd.get('icon') ?? '') || null,
          sortOrder: Number(fd.get('sortOrder') ?? 0),
          criteria: formToCriteria(crit),
        }
        setError(null)
        start(async () => {
          const res = badge ? await updateBadge(badge.id, input) : await createBadge(input)
          if (!res.ok) return setError(res.error)
          toast(badge ? '保存しました。' : 'バッジを追加しました。')
          router.refresh()
          onDone()
        })
      }}
    >
      <Field label="バッジ名" htmlFor="b-name">
        <Input id="b-name" name="name" required maxLength={60} defaultValue={badge?.name ?? ''} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="slug" htmlFor="b-slug" hint="空欄なら自動生成">
          <Input id="b-slug" name="slug" pattern="[a-z0-9-]*" maxLength={60} defaultValue={badge?.slug ?? ''} className="font-mono" />
        </Field>
        <Field label="アイコン（lucide 名など・任意）" htmlFor="b-icon">
          <Input id="b-icon" name="icon" maxLength={40} defaultValue={badge?.icon ?? ''} />
        </Field>
      </div>
      <Field label="説明" htmlFor="b-desc">
        <Textarea id="b-desc" name="description" maxLength={300} defaultValue={badge?.description ?? ''} className="min-h-[72px]" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="獲得条件" htmlFor="b-type">
          <Select id="b-type" value={crit.type} onChange={(e) => setCrit((c) => ({ ...c, type: e.target.value as BadgeCriteria['type'] }))}>
            {CRITERIA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
        {crit.type === 'category_complete' ? (
          <Field label="カテゴリ" htmlFor="b-cat">
            <Select id="b-cat" value={crit.category} onChange={(e) => setCrit((c) => ({ ...c, category: e.target.value }))} required>
              <option value="">選択</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label={`数値（${type?.unit ?? ''}）`} htmlFor="b-value">
            <Input id="b-value" type="number" min={1} required value={crit.value} onChange={(e) => setCrit((c) => ({ ...c, value: e.target.value }))} className="tnum" />
          </Field>
        )}
      </div>
      <Field label="表示順" htmlFor="b-sort">
        <Input id="b-sort" name="sortOrder" type="number" min={0} defaultValue={badge?.sortOrder ?? 0} className="w-32 tnum" />
      </Field>
      <FormMessage message={error} />
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>{pending ? '保存中…' : '保存'}</Button>
      </div>
    </form>
  )
}

/** ADM-09: バッジ一覧 / 追加 / 編集 / 削除 */
export function BadgeEditor({ badges, categories }: { badges: BadgeRow[]; categories: Category[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState<string | null>(null) // 'new' | badge.id

  return (
    <div className="space-y-4">
      {badges.length === 0 ? (
        <p className="caption">バッジはまだありません。</p>
      ) : (
        <ul className="divide-y border-y">
          {badges.map((b) => (
            <li key={b.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[15px]">{b.name}</p>
                <p className="caption">
                  {describeCriteria(b.criteria, categories)}
                  {b.description ? ` — ${b.description}` : ''}
                </p>
              </div>
              <span className="caption font-mono">{b.slug}</span>
              <Dialog open={open === b.id} onOpenChange={(o) => setOpen(o ? b.id : null)}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" aria-label="編集"><Pencil /></Button>
                </DialogTrigger>
                <DialogContent title="バッジを編集">
                  <BadgeForm badge={b} categories={categories} onDone={() => setOpen(null)} />
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="削除"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`バッジ「${b.name}」を削除します。獲得済みの会員からも消えます。よろしいですか？`)) return
                  start(async () => {
                    const res = await deleteBadge(b.id)
                    toast(res.ok ? '削除しました。' : res.error)
                    router.refresh()
                  })
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open === 'new'} onOpenChange={(o) => setOpen(o ? 'new' : null)}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm"><Plus /> バッジを追加</Button>
        </DialogTrigger>
        <DialogContent title="バッジを追加">
          <BadgeForm categories={categories} onDone={() => setOpen(null)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
