import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { runAITask } from '@/server/ai-task'
import { productInterviewTask } from '@/prompts/product-interview'
import { productAnalysisTask } from '@/prompts/product-analysis'
import { buildProjectContext } from '@/features/assistant/context'
import { advanceStage } from '@/features/projects/service'
import { calculateCompleteness } from './domain'
import type { JobHandler } from '@/jobs/types'

const interviewPayload = z.object({
  projectId: z.string(),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
})

/**
 * STEP 1: 自由入力 → 構造化 → 不足項目の質問生成(要件11〜13)。
 * AIの結果で既存の確定値を上書きしないよう、空欄のみを埋める。
 */
const runInterview: JobHandler = async (context) => {
  const payload = interviewPayload.parse(context.payload)
  const product = await db.product.findUnique({ where: { projectId: payload.projectId } })
  if (!product) throw new Error('商品情報が見つかりません')

  const existing = Object.fromEntries(
    Object.entries({
      name: product.name,
      category: product.category,
      description: product.description,
      purpose: product.purpose,
      problem: product.problem,
      target: product.target,
      price: product.price,
      country: product.country,
      channel: product.channel,
      size: product.size,
      weight: product.weight,
      material: product.material,
      color: product.color,
    }).filter(([, value]) => value !== null && value !== ''),
  )

  await context.setProgress(20)

  const result = await runAITask(
    productInterviewTask,
    { rawInput: product.rawInput ?? product.description ?? product.name, existing, answers: payload.answers },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )

  await context.setProgress(70)

  const ai = result.data.product
  // 既存の値を優先し、未入力の項目だけAIの提案で埋める。
  const merged = {
    name: product.name || ai.name,
    category: product.category ?? ai.category,
    description: product.description ?? ai.description,
    purpose: product.purpose ?? ai.purpose,
    problem: product.problem ?? ai.problem,
    target: product.target ?? ai.target,
    price: product.price ?? ai.price,
    country: product.country ?? ai.country,
    channel: product.channel ?? ai.channel,
    size: product.size ?? ai.size,
    weight: product.weight ?? ai.weight,
    material: product.material ?? ai.material,
    color: product.color ?? ai.color,
    designNote: product.designNote ?? ai.designNote,
    features: Array.isArray(product.features) && product.features.length > 0 ? product.features : ai.features,
    usp: Array.isArray(product.usp) && product.usp.length > 0 ? product.usp : ai.usp,
  }

  await db.product.update({
    where: { id: product.id },
    data: {
      ...merged,
      features: merged.features as string[],
      usp: merged.usp as string[],
      openQuestions: result.data.questions,
      completeness: calculateCompleteness({
        ...merged,
        features: merged.features as string[],
        usp: merged.usp as string[],
      }),
    },
  })

  await advanceStage(payload.projectId, 'IDEA')
  return { summary: result.data.summary, questions: result.data.questions, synthetic: result.synthetic }
}

const analysisPayload = z.object({ projectId: z.string() })

/** 商品情報から初期仮説と調査キーワードを作る。 */
const runAnalysis: JobHandler = async (context) => {
  const payload = analysisPayload.parse(context.payload)
  const snapshot = await buildProjectContext(payload.projectId)
  await context.setProgress(30)

  const result = await runAITask(
    productAnalysisTask,
    { context: snapshot },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )

  return { ...result.data, synthetic: result.synthetic }
}

export const productJobHandlers: Record<string, JobHandler> = {
  'products.interview': runInterview,
  'products.analysis': runAnalysis,
}
