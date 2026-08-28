'use client'

import { useActionState, useEffect, useState } from 'react'
import { ExternalLink, Pencil, Plus, Swords, Trash2 } from 'lucide-react'
import { deleteCompetitorAction, saveCompetitorAction } from '@/features/brands/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState, InlineNotice } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import type { ActionResult } from '@/lib/errors'

export type CompetitorData = {
  id: string
  name: string
  website: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  youtubeUrl: string | null
  notes: string | null
  publicSummary: string | null
  fetchError: string | null
}

/**
 * 競合の登録(要件20)。
 * SNSの投稿内容は自動取得しない(非公式APIによる大量スクレイピングは行わない)。
 * 取得できない情報は、担当者がメモとして補える形にしている。
 */
export function CompetitorPanel({
  brandId,
  brandName,
  competitors,
}: {
  brandId: string
  brandName: string
  competitors: CompetitorData[]
}) {
  const [editing, setEditing] = useState<CompetitorData | 'new' | null>(null)
  const [, deleteAction] = useActionState<ActionResult | null, FormData>(deleteCompetitorAction, null)

  return (
    <Card>
      <CardHeader
        icon={<Swords className="h-4 w-4" />}
        title={`${brandName} の競合`}
        description="URLとメモを登録しておくと、調査と企画で自動的に考慮されます。"
        action={
          <Button variant="secondary" size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            競合を追加
          </Button>
        }
      />
      <CardBody className="space-y-3">
        <InlineNotice tone="info" title="SNSの投稿内容は自動取得しません。">
          各SNSの規約に反する大量取得は行いません。参考にしたい投稿は、下のメモへ貼り付けてください。
        </InlineNotice>

        {competitors.length === 0 ? (
          <EmptyState
            className="border-0"
            icon={<Swords className="h-6 w-6" />}
            title="まだ競合が登録されていません"
            description="意識している他社を登録すると、差別化の余地を分析しやすくなります。"
            action={
              <Button variant="gradient" onClick={() => setEditing('new')}>
                競合を追加する
              </Button>
            }
          />
        ) : (
          competitors.map((competitor) => (
            <div key={competitor.id} className="rounded-[14px] border border-line px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[14px] font-bold text-navy">{competitor.name}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(competitor)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    編集
                  </Button>
                  <form
                    action={(form) => {
                      form.set('brandId', brandId)
                      form.set('competitorId', competitor.id)
                      deleteAction(form)
                    }}
                  >
                    <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger-wash hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      削除
                    </Button>
                  </form>
                </div>
              </div>

              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <UrlItem label="Website" url={competitor.website} />
                <UrlItem label="Instagram" url={competitor.instagramUrl} />
                <UrlItem label="TikTok" url={competitor.tiktokUrl} />
                <UrlItem label="YouTube" url={competitor.youtubeUrl} />
              </ul>

              {competitor.notes ? (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">{competitor.notes}</p>
              ) : null}

              {competitor.fetchError ? (
                <p className="mt-2 rounded-[10px] bg-canvas-alt px-3 py-2 text-[12px] text-ink-muted">
                  ページ情報を取得できませんでした。投稿内容はメモへテキストで追加してください。
                </p>
              ) : null}
            </div>
          ))
        )}
      </CardBody>

      <CompetitorDialog
        brandId={brandId}
        competitor={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </Card>
  )
}

function UrlItem({ label, url }: { label: string; url: string | null }) {
  if (!url) return null
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
      >
        {label}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </li>
  )
}

function CompetitorDialog({
  brandId,
  competitor,
  open,
  onClose,
}: {
  brandId: string
  competitor: CompetitorData | null
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCompetitorAction, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success('競合情報を保存しました。')
      onClose()
    }
  }, [state, toast, onClose])

  return (
    <Dialog open={open} onClose={onClose} title={competitor ? '競合を編集' : '競合を追加'}>
      {state && !state.ok ? <ErrorState className="mb-4" title={state.message} hint={state.hint} /> : null}

      <form action={action} className="space-y-4" key={competitor?.id ?? 'new'}>
        <input type="hidden" name="brandId" value={brandId} />
        {competitor ? <input type="hidden" name="competitorId" value={competitor.id} /> : null}

        <Field label="企業名" htmlFor="competitor-name" required>
          <Input id="competitor-name" name="name" defaultValue={competitor?.name ?? ''} required />
        </Field>
        <Field label="Website" htmlFor="competitor-website">
          <Input id="competitor-website" name="website" type="url" defaultValue={competitor?.website ?? ''} />
        </Field>
        <Field label="Instagram URL" htmlFor="competitor-instagram">
          <Input id="competitor-instagram" name="instagramUrl" type="url" defaultValue={competitor?.instagramUrl ?? ''} />
        </Field>
        <Field label="TikTok URL" htmlFor="competitor-tiktok">
          <Input id="competitor-tiktok" name="tiktokUrl" type="url" defaultValue={competitor?.tiktokUrl ?? ''} />
        </Field>
        <Field label="YouTube URL" htmlFor="competitor-youtube">
          <Input id="competitor-youtube" name="youtubeUrl" type="url" defaultValue={competitor?.youtubeUrl ?? ''} />
        </Field>
        <Field label="メモ" htmlFor="competitor-notes" hint="参考にしたい投稿の内容や、気づいた訴求の傾向など。">
          <Textarea id="competitor-notes" name="notes" defaultValue={competitor?.notes ?? ''} rows={4} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <SubmitButton>保存する</SubmitButton>
        </div>
      </form>
    </Dialog>
  )
}
