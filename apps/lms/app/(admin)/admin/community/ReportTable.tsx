'use client'
import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { resolveReport } from '@/lib/actions/admin/community'
import { deleteComment, deletePost, hideContent } from '@/lib/actions/community'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, Td, Th } from '@/components/ui/Table'
import { toast } from '@/components/ui/Toaster'
import { formatDateTime } from '@/lib/utils'
import type { ReportItem } from '@/lib/db/queries/community'

const TARGET_LABEL: Record<string, string> = { post: '投稿', comment: 'コメント', qa_thread: 'Q&A', qa_reply: 'Q&A 回答' }

/** ADM-07 / COM-07: 通報一覧（対象へのリンク・非表示・削除・解決済み） */
export function ReportTable({ reports, canAct }: { reports: ReportItem[]; canAct: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      const r = await fn()
      if (!r.ok) return toast(r.error ?? '処理に失敗しました。')
      toast(done)
      router.refresh()
    })
  const remove = (r: ReportItem) => {
    if (!window.confirm(`この${TARGET_LABEL[r.targetType] ?? '内容'}を削除します。よろしいですか？`)) return
    if (r.targetType === 'post') run(() => deletePost(r.targetId), '削除しました。')
    else if (r.targetType === 'comment') run(() => deleteComment(r.targetId), '削除しました。')
  }

  if (reports.length === 0) return <p className="py-8 text-center font-serif text-ink-700">通報はありません。</p>
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-40">日時</Th>
          <Th className="w-24">対象</Th>
          <Th>内容 / 理由</Th>
          <Th className="w-28">通報者</Th>
          <Th className="w-24">状態</Th>
          {canAct && <Th className="w-64 text-right">操作</Th>}
        </tr>
      </thead>
      <tbody>
        {reports.map((r) => {
          const resolved = r.resolvedAt !== null
          const canModerate = r.targetType === 'post' || r.targetType === 'comment'
          return (
            <tr key={r.id} className={resolved ? 'text-stone-400' : undefined}>
              <Td className="tnum whitespace-nowrap text-stone-500">{formatDateTime(r.createdAt)}</Td>
              <Td>
                {r.link ? (
                  <Link href={r.link} className="text-ink-700">
                    {TARGET_LABEL[r.targetType] ?? r.targetType}
                  </Link>
                ) : (
                  <span>{TARGET_LABEL[r.targetType] ?? r.targetType}</span>
                )}
              </Td>
              <Td>
                {r.excerpt === null ? (
                  <p className="text-stone-400">（削除済み）</p>
                ) : (
                  <p className="line-clamp-2 font-serif text-ink-700">{r.excerpt}</p>
                )}
                {r.reason && <p className="caption mt-1">理由: {r.reason}</p>}
              </Td>
              <Td>
                <Link href={`/members/${r.reporter.id}`} className="text-ink-700">
                  {r.reporter.displayName}
                </Link>
              </Td>
              <Td>
                {resolved ? <Badge variant="muted">解決済み</Badge> : <Badge variant="status">未対応</Badge>}
                {r.hidden && (
                  <Badge variant="muted" className="ml-1">
                    非表示
                  </Badge>
                )}
              </Td>
              {canAct && (
                <Td className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-0.5">
                    {canModerate && r.excerpt !== null && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => hideContent(r.targetType as 'post' | 'comment', r.targetId, !r.hidden), r.hidden ? '再表示しました。' : '非表示にしました。')}
                        >
                          {r.hidden ? '再表示' : '非表示'}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={pending} className="hover:text-state-danger" onClick={() => remove(r)}>
                          削除
                        </Button>
                      </>
                    )}
                    {!resolved && (
                      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => resolveReport(r.id), '解決済みにしました。')}>
                        解決済み
                      </Button>
                    )}
                  </div>
                </Td>
              )}
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}
