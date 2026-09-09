'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/admin/categories'

type Category = { id: string; name: string; slug: string; sortOrder: number; courseCount: number }

/** コース一覧内のカテゴリ管理（簡易） */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  return (
    <div className="space-y-3">
      {categories.length > 0 ? (
        <ul className="divide-y border-y">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              {editingId === c.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    start(async () => {
                      const res = await updateCategory(c.id, { name: editName })
                      toast(res.ok ? '保存しました。' : res.error)
                      if (res.ok) {
                        setEditingId(null)
                        router.refresh()
                      }
                    })
                  }}
                >
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" autoFocus aria-label="カテゴリ名" />
                  <Button type="submit" size="sm" disabled={pending}>保存</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>取消</Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 font-sans text-[13px]">{c.name}</span>
                  <span className="caption font-mono">{c.slug}</span>
                  <span className="caption tnum">{Number(c.courseCount)} コース</span>
                  <Button type="button" variant="ghost" size="icon" aria-label="名前を変更" onClick={() => { setEditingId(c.id); setEditName(c.name) }}>
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="削除"
                    disabled={pending || Number(c.courseCount) > 0}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteCategory(c.id)
                        toast(res.ok ? '削除しました。' : res.error)
                        if (res.ok) router.refresh()
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="caption">カテゴリはまだありません。</p>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          start(async () => {
            const res = await createCategory({ name })
            toast(res.ok ? 'カテゴリを追加しました。' : res.error)
            if (res.ok) {
              setName('')
              router.refresh()
            }
          })
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="新しいカテゴリ名" maxLength={60} className="h-9 max-w-xs" aria-label="新しいカテゴリ名" />
        <Button type="submit" variant="outline" size="sm" disabled={pending || !name.trim()}>
          <Plus /> 追加
        </Button>
      </form>
    </div>
  )
}
