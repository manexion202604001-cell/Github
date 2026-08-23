import { apiHandler, jsonOk } from '@/server/api'
import { startCompare } from '@/features/products/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 300

type Context = { params: Promise<{ id: string }> }

/** 商品概要の比較評価(ユーザー入力 vs AI独自案)を開始する。 */
export const POST = apiHandler<Context>(async (_request, context) => {
  const { id } = await context.params
  const job = await startCompare(id)
  return jsonOk({ jobId: job.id }, { status: 202 })
})
