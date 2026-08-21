import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/server/audit'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { toStringArray } from '@/features/assistant/context'
import { calculateCompleteness, missingFields } from './domain'
import type { InterviewAnswerInput, UpdateProductInput } from './schema'

export async function getProduct(projectId: string) {
  await requireProjectAccess(projectId)
  const product = await db.product.findUnique({ where: { projectId } })
  if (!product) throw AppError.notFound('商品情報が見つかりません')

  return {
    ...product,
    features: toStringArray(product.features),
    usp: toStringArray(product.usp),
    openQuestions: parseQuestions(product.openQuestions),
    references: parseReferences(product.references),
  }
}

export async function updateProduct(projectId: string, input: UpdateProductInput) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const current = await db.product.findUnique({ where: { projectId } })
  if (!current) throw AppError.notFound('商品情報が見つかりません')

  const merged = {
    name: input.name ?? current.name,
    category: input.category !== undefined ? input.category : current.category,
    description: input.description !== undefined ? input.description : current.description,
    purpose: input.purpose !== undefined ? input.purpose : current.purpose,
    problem: input.problem !== undefined ? input.problem : current.problem,
    target: input.target !== undefined ? input.target : current.target,
    price: input.price !== undefined ? input.price : current.price,
    country: input.country !== undefined ? input.country : current.country,
    channel: input.channel !== undefined ? input.channel : current.channel,
    features: input.features ?? toStringArray(current.features),
    usp: input.usp ?? toStringArray(current.usp),
  }

  const completeness = calculateCompleteness(merged)

  const product = await db.product.update({
    where: { projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
      ...(input.problem !== undefined ? { problem: input.problem } : {}),
      ...(input.target !== undefined ? { target: input.target } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
      ...(input.channel !== undefined ? { channel: input.channel } : {}),
      ...(input.size !== undefined ? { size: input.size } : {}),
      ...(input.weight !== undefined ? { weight: input.weight } : {}),
      ...(input.material !== undefined ? { material: input.material } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.designNote !== undefined ? { designNote: input.designNote } : {}),
      ...(input.features !== undefined ? { features: input.features } : {}),
      ...(input.usp !== undefined ? { usp: input.usp } : {}),
      ...(input.references !== undefined ? { references: input.references } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      completeness,
    },
  })

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'product.update',
    entityType: 'Product',
    entityId: product.id,
    diff: input,
  })

  return product
}

/** AIヒアリングを非同期で実行する(要件13)。 */
export async function startInterview(projectId: string, input: InterviewAnswerInput) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const product = await db.product.findUnique({ where: { projectId } })
  if (!product) throw AppError.notFound('商品情報が見つかりません')

  if (input.rawInput !== undefined) {
    await db.product.update({ where: { projectId }, data: { rawInput: input.rawInput } })
  }

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'products.interview',
    payload: { projectId, answers: input.answers },
    createdBy: context.user.id,
  })
}

/** 商品仕様のスナップショットを新しいVersionとして保存する(要件74, 112)。 */
export async function createProductVersion(input: {
  productId: string
  specification: unknown
  changeReason: string | null
  changedFields?: string[]
  expectedEffect?: string | null
}) {
  const latest = await db.productVersion.findFirst({
    where: { productId: input.productId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const version = (latest?.version ?? 0) + 1

  const [, created] = await db.$transaction([
    db.productVersion.updateMany({ where: { productId: input.productId }, data: { isCurrent: false } }),
    db.productVersion.create({
      data: {
        productId: input.productId,
        version,
        specification: JSON.parse(JSON.stringify(input.specification)),
        changeReason: input.changeReason,
        changedFields: input.changedFields ?? [],
        expectedEffect: input.expectedEffect ?? null,
        isCurrent: true,
      },
    }),
  ])

  return created
}

export async function listProductVersions(projectId: string) {
  await requireProjectAccess(projectId)
  const product = await db.product.findUnique({ where: { projectId }, select: { id: true } })
  if (!product) return []
  return db.productVersion.findMany({ where: { productId: product.id }, orderBy: { version: 'desc' } })
}

export function computeMissingFields(product: {
  name: string | null
  category: string | null
  description: string | null
  purpose: string | null
  problem: string | null
  target: string | null
  price: number | null
  country: string | null
  channel: string | null
  features: unknown
  usp: unknown
}) {
  return missingFields({
    name: product.name,
    category: product.category,
    description: product.description,
    purpose: product.purpose,
    problem: product.problem,
    target: product.target,
    price: product.price,
    country: product.country,
    channel: product.channel,
    features: toStringArray(product.features),
    usp: toStringArray(product.usp),
  })
}

export type InterviewQuestion = { field: string; question: string; why: string; examples: string[] }

export function parseQuestions(value: unknown): InterviewQuestion[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if (typeof record.question !== 'string') return []
    return [
      {
        field: typeof record.field === 'string' ? record.field : '',
        question: record.question,
        why: typeof record.why === 'string' ? record.why : '',
        examples: toStringArray(record.examples),
      },
    ]
  })
}

function parseReferences(value: unknown): { label: string; url: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if (typeof record.url !== 'string') return []
    return [{ label: typeof record.label === 'string' ? record.label : record.url, url: record.url }]
  })
}
