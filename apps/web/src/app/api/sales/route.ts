import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import { deleteSales, listSales, startSalesAnalysis, upsertSales } from '@/features/sales/service'

/** Vercel: レスポンス後に実行されるJob(after)も含めた関数の実行上限。 */
export const maxDuration = 300


const salesSchema = z.object({
  projectId: z.string().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  channel: z.string().max(80).optional(),
  revenue: z.number().min(0),
  units: z.number().int().min(0),
  sessions: z.number().int().min(0).default(0),
  adSpend: z.number().min(0).default(0),
  adSales: z.number().min(0).default(0),
  searchRank: z.number().int().min(1).nullable().optional(),
  reviewCount: z.number().int().min(0).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  returns: z.number().int().min(0).default(0),
  inventory: z.number().int().min(0).nullable().optional(),
  profit: z.number().nullable().optional(),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, salesSchema)
  return jsonOk(await upsertSales(input.projectId, input))
})

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await listSales(projectId))
})

/** PUT: 販売後AI分析を開始する(要件70〜72)。 */
export const PUT = apiHandler(async (request) => {
  const input = await parseBody(request, z.object({ projectId: z.string().min(1) }))
  const job = await startSalesAnalysis(input.projectId)
  return jsonOk({ jobId: job.id }, { status: 202 })
})

export const DELETE = apiHandler(async (request) => {
  const input = await parseBody(request, z.object({ projectId: z.string().min(1), id: z.string().min(1) }))
  await deleteSales(input.projectId, input.id)
  return jsonOk({ ok: true })
})
