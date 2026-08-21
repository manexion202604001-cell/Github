import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { AppError } from '@/lib/errors'
import { getSimulation, saveSimulation } from '@/features/cost-simulation/service'
import { calculateCost, priceSweep, reverseCalculateMaxCost } from '@/features/cost-simulation/domain'

const inputSchema = z.object({
  projectId: z.string().min(1),
  label: z.string().max(60).optional(),
  sellingPrice: z.number().min(0).max(100_000_000),
  manufacturingCost: z.number().min(0).max(100_000_000),
  shipping: z.number().min(0).default(0),
  importCost: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  packaging: z.number().min(0).default(0),
  amazonFeeRate: z.number().min(0).max(0.99).default(0.15),
  fbaFee: z.number().min(0).default(0),
  advertisingRate: z.number().min(0).max(0.99).default(0.1),
  returnRate: z.number().min(0).max(0.99).default(0.03),
  otherCost: z.number().min(0).default(0),
  monthlyUnits: z.number().min(0).default(0),
  fixedCost: z.number().min(0).default(0),
  targetProfitRate: z.number().min(0).max(0.9).optional(),
  /** true なら保存せず計算結果のみ返す(スライダーのリアルタイム再計算用、要件41)。 */
  dryRun: z.boolean().default(false),
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, inputSchema)

  if (input.dryRun) {
    const result = calculateCost(input)
    const maxCost =
      input.targetProfitRate === undefined
        ? result.maxManufacturingCost
        : reverseCalculateMaxCost({ ...input, targetProfitRate: input.targetProfitRate })
    return jsonOk({
      result: { ...result, maxManufacturingCost: maxCost },
      sweep: priceSweep(input, {
        from: Math.max(500, Math.round(input.sellingPrice * 0.5)),
        to: Math.round(input.sellingPrice * 1.6),
        steps: 24,
      }),
    })
  }

  return jsonOk(await saveSimulation(input.projectId, input))
})

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await getSimulation(projectId))
})
