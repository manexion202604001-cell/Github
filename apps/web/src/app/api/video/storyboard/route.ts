import { z } from 'zod'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { startStoryboard } from '@/features/video/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 60


const schema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  purpose: z.enum(['AMAZON', 'TIKTOK', 'INSTAGRAM_REELS', 'YOUTUBE_SHORTS', 'YOUTUBE', 'ADS']),
  videoType: z.enum(['PRODUCT_INTRO', 'UGC', 'PROBLEM_SOLVING', 'COMPARISON', 'LUXURY_BRAND', 'DEMONSTRATION', 'SNS_AD']),
  durationSec: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30), z.literal(60)]),
  aspectRatio: z.enum(['RATIO_9_16', 'RATIO_16_9', 'RATIO_1_1']),
})

/** 動画戦略〜ストーリーボード〜台本〜プロンプト生成(要件59〜63)。 */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema)
  const { videoProject, job } = await startStoryboard(input.projectId, input)
  return jsonOk({ videoProjectId: videoProject.id, jobId: job.id }, { status: 202 })
})
