'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { deleteAnnouncement, publishAnnouncement, unpublishAnnouncement } from '@/lib/actions/admin/announcements'

/** ADM-10: 公開 / 非公開 / 削除 */
export function AnnouncementActions({ id, published, compact = false }: { id: string; published: boolean; compact?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) return toast(res.error ?? '処理に失敗しました。')
      toast(success)
      if (after) after()
      else router.refresh()
    })
  return (
    <div className="flex flex-wrap gap-2">
      {published ? (
        <Button variant={compact ? 'ghost' : 'outline'} size="sm" disabled={pending} onClick={() => run(() => unpublishAnnouncement(id), '非公開にしました。')}>
          非公開にする
        </Button>
      ) : (
        <Button variant="accent" size="sm" disabled={pending} onClick={() => {
          if (!confirm('公開すると全会員に通知されます。よろしいですか？')) return
          run(() => publishAnnouncement(id), '公開しました。')
        }}>
          公開
        </Button>
      )}
      <Button variant={compact ? 'ghost' : 'danger'} size="sm" disabled={pending} onClick={() => {
        if (!confirm('このお知らせを削除します。よろしいですか？')) return
        run(() => deleteAnnouncement(id), '削除しました。', () => router.push('/admin/announcements'))
      }}>
        削除
      </Button>
    </div>
  )
}
