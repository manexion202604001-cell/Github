import { z } from 'zod'
import { nonEmptyString, optionalString } from '@/validators/common'

export const PROJECT_STAGES = [
  'IDEA',
  'IMAGE',
  'MARKET_RESEARCH',
  'EVALUATION',
  'COST_SIMULATION',
  'PRODUCT_DESIGN',
  'OEM',
  'SAMPLE',
  'LP',
  'VIDEO',
  'LAUNCH',
  'SELLING',
  'IMPROVEMENT',
  'COMPLETED',
] as const

export const STAGE_LABEL: Record<(typeof PROJECT_STAGES)[number], string> = {
  IDEA: 'アイデア',
  IMAGE: '商品イメージ',
  MARKET_RESEARCH: '市場調査',
  EVALUATION: '商品評価',
  COST_SIMULATION: '利益シミュレーション',
  PRODUCT_DESIGN: '商品仕様',
  OEM: 'OEM',
  SAMPLE: 'サンプル',
  LP: 'LP',
  VIDEO: 'PR動画',
  LAUNCH: '販売準備',
  SELLING: '販売中',
  IMPROVEMENT: '改善',
  COMPLETED: '完了',
}

export const createProjectSchema = z.object({
  name: nonEmptyString.max(120),
  description: optionalString(2000),
  /** STEP1の商品概要をそのまま受け取り、Productの下書きを同時に作る。 */
  idea: optionalString(8000),
})

export const updateProjectSchema = z.object({
  name: nonEmptyString.max(120).optional(),
  description: optionalString(2000),
  stage: z.enum(PROJECT_STAGES).optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'ARCHIVED']).optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
