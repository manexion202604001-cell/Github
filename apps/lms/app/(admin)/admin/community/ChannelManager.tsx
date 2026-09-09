'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { createChannel, deleteChannel, moveChannel, updateChannel } from '@/lib/actions/admin/community'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Input, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/Toaster'

export type AdminChannel = { id: string; slug: string; name: string; description: string | null; sortOrder: number; postCount: number }

/** ADM-07 / COM-01: チャンネル CRUD（作成・編集・上下並び替え・削除） */
export function ChannelManager({ channels, canEdit }: { channels: AdminChannel[]; canEdit: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<AdminChannel | 'new' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const openNew = () => {
    setName('')
    setDescription('')
    setError(null)
    setEditing('new')
  }
  const openEdit = (c: AdminChannel) => {
    setName(c.name)
    setDescription(c.description ?? '')
    setError(null)
    setEditing(c)
  }
  const save = () =>
    start(async () => {
      const r = editing === 'new' ? await createChannel({ name, description }) : editing ? await updateChannel(editing.id, { name, description }) : null
      if (!r) return
      if (!r.ok) return setError(r.error)
      setEditing(null)
      toast(editing === 'new' ? 'チャンネルを作成しました。' : '保存しました。')
      router.refresh()
    })
  const move = (id: string, dir: 'up' | 'down') =>
    start(async () => {
      const r = await moveChannel(id, dir)
      if (!r.ok) return toast(r.error)
      router.refresh()
    })
  const remove = (c: AdminChannel) => {
    if (!window.confirm(`「${c.name}」を削除します。投稿 ${c.postCount} 件も削除されます。よろしいですか？`)) return
    start(async () => {
      const r = await deleteChannel(c.id)
      if (!r.ok) return toast(r.error)
      toast('削除しました。')
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">Channels</p>
        {canEdit && (
          <Button size="sm" onClick={openNew} disabled={pending}>
            チャンネルを追加
          </Button>
        )}
      </div>
      <Table>
        <thead>
          <tr>
            <Th className="w-12">順</Th>
            <Th>名称</Th>
            <Th className="hidden md:table-cell">説明</Th>
            <Th className="w-20 text-right">投稿</Th>
            {canEdit && <Th className="w-56 text-right">操作</Th>}
          </tr>
        </thead>
        <tbody>
          {channels.map((c, i) => (
            <tr key={c.id}>
              <Td className="tnum text-stone-500">{i + 1}</Td>
              <Td>
                <span className="text-ink-900">{c.name}</span>
                <span className="caption ml-2">/{c.slug}</span>
              </Td>
              <Td className="hidden text-stone-500 md:table-cell">{c.description}</Td>
              <Td className="tnum text-right">{c.postCount}</Td>
              {canEdit && (
                <Td className="text-right">
                  <div className="inline-flex gap-0.5">
                    <Button variant="ghost" size="icon" aria-label="上へ" disabled={pending || i === 0} onClick={() => move(c.id, 'up')}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="下へ" disabled={pending || i === channels.length - 1} onClick={() => move(c.id, 'down')}>
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="編集" disabled={pending} onClick={() => openEdit(c)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="削除" disabled={pending} className="hover:text-state-danger" onClick={() => remove(c)}>
                      <Trash2 />
                    </Button>
                  </div>
                </Td>
              )}
            </tr>
          ))}
          {channels.length === 0 && (
            <tr>
              <Td colSpan={canEdit ? 5 : 4} className="py-8 text-center font-serif">
                チャンネルはまだありません。
              </Td>
            </tr>
          )}
        </tbody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === 'new' ? 'チャンネルを追加' : 'チャンネルを編集'} description={editing === 'new' ? 'URL 用の slug は名称から自動生成されます。' : undefined}>
          <div className="space-y-4">
            <Field label="名称" htmlFor="channel-name" error={error ?? undefined}>
              <Input id="channel-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </Field>
            <Field label="説明" htmlFor="channel-description" hint="チャンネルページの見出しの下に表示されます。">
              <Textarea id="channel-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="min-h-[96px]" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
                キャンセル
              </Button>
              <Button onClick={save} disabled={pending || name.trim().length === 0}>
                {pending ? '保存中…' : '保存する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
