'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'
import { generateCaptionsAction } from '@/features/scripts/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

export type CaptionData = {
  instagramCaption: string | null
  tiktokCaption: string | null
  youtubeTitle: string | null
  description: string | null
  cta: string | null
  hashtags: string[]
} | null

/** 投稿文章(要件40)。メイン機能ではないため台本ページ下部へ置く。 */
export function CaptionPanel({ scriptId, captions }: { scriptId: string; captions: CaptionData }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function generate() {
    startTransition(async () => {
      const result = await generateCaptionsAction(scriptId)
      if (result.ok) {
        toast.ai('投稿文を作成しました。')
        router.refresh()
      } else {
        toast.error(result.message, result.hint ?? undefined)
      }
    })
  }

  return (
    <Card>
      <CardHeader
        icon={<MessageSquareText className="h-4 w-4" />}
        title="投稿文章"
        description="キャプション・タイトル・ハッシュタグの案です。投稿は各SNSで行ってください。"
        action={
          <Button variant="secondary" size="sm" onClick={generate} loading={pending}>
            {captions ? '作り直す' : '投稿文を作る'}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {!captions ? (
          <p className="text-[13px] text-ink-muted">まだ投稿文がありません。台本の内容から各SNS向けの文章を作成します。</p>
        ) : (
          <>
            <CaptionBlock label="Instagram Caption" value={captions.instagramCaption} />
            <CaptionBlock label="TikTok Caption" value={captions.tiktokCaption} />
            <CaptionBlock label="YouTube Shorts Title" value={captions.youtubeTitle} />
            <CaptionBlock label="Description" value={captions.description} />
            <CaptionBlock label="CTA" value={captions.cta} />
            {captions.hashtags.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold tracking-wide text-ink-subtle">Hashtags</p>
                  <CopyButton value={captions.hashtags.join(' ')} />
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {captions.hashtags.map((tag) => (
                    <li key={tag}>
                      <Badge tone="cyan">{tag}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  )
}

function CaptionBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="rounded-[14px] border border-line px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold tracking-wide text-ink-subtle">{label}</p>
        <CopyButton value={value} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-navy">{value}</p>
    </div>
  )
}
