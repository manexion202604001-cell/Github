import type { NextRequest } from 'next/server'
import { apiHandler } from '@/server/api'
import { listIdeas } from '@/features/ideas/service'
import { toCsv } from '@/features/ideas/domain'
import { channelLabel } from '@/lib/config/channels'
import { ideaCategoryLabel } from '@/lib/config/taxonomy'

/** 企画一覧の CSV ダウンロード(要件102)。 */
export const GET = apiHandler(async (request: NextRequest) => {
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId') ?? undefined
  const channel = url.searchParams.get('channel') ?? undefined

  const ideas = await listIdeas({ ...(brandId ? { brandId } : {}), ...(channel ? { channel } : {}) }, 500)

  const csv = toCsv(
    ideas.map((idea) => ({
      タイトル: idea.title,
      カテゴリー: ideaCategoryLabel(idea.category),
      SNS: channelLabel(idea.channel),
      Hook: idea.hook,
      概要: idea.summary,
      この企画の理由: idea.whyThisIdea,
      ターゲット: idea.target ?? '',
      CTA: idea.cta ?? '',
      想定尺秒: idea.durationSec,
      制作難易度: idea.difficulty,
      AI推定スコア: idea.score?.overall ?? '',
      台本数: idea._count.scripts,
      作成日: idea.createdAt.toISOString().slice(0, 10),
    })),
  )

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="ideas.csv"',
    },
  })
})
