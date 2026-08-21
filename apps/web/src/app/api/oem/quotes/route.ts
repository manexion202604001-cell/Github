import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { requireProjectAccess } from '@/server/authz'
import { buildComparison, deleteQuote, listQuotes, upsertQuote } from '@/features/oem/service'
import { optionalString } from '@/validators/common'

const quoteSchema = z.object({
  projectId: z.string().min(1),
  supplierId: z.string().min(1),
  status: z.enum(['DRAFT', 'REQUESTED', 'RECEIVED', 'ACCEPTED', 'REJECTED']).optional(),
  unitPrice: z.number().int().min(0).nullable().optional(),
  moq: z.number().int().min(0).nullable().optional(),
  sampleCost: z.number().int().min(0).nullable().optional(),
  shippingCost: z.number().int().min(0).nullable().optional(),
  toolingCost: z.number().int().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
  note: optionalString(2000),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, quoteSchema)
  return jsonOk(await upsertQuote(input.projectId, input))
})

/** 見積一覧 + 比較表(要件47)。 */
export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')

  await requireProjectAccess(projectId)
  const quotes = await listQuotes(projectId)
  const cost = await db.costSimulation.findFirst({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    select: { maxManufacturingCost: true },
  })
  return jsonOk({ quotes, comparison: buildComparison(quotes, cost?.maxManufacturingCost ?? null) })
})

export const DELETE = apiHandler(async (request) => {
  const input = await parseBody(request, z.object({ projectId: z.string().min(1), quoteId: z.string().min(1) }))
  await deleteQuote(input.projectId, input.quoteId)
  return jsonOk({ ok: true })
})
