import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { IMAGE_ANGLES, ANGLE_LABEL, type GeneratedImage } from '@/providers/image'
import { imageChainFor } from '@/server/org-providers'
import { runWithFallback } from '@/providers/registry'
import { recordUsage } from '@/server/usage'
import { advanceStage } from '@/features/projects/service'
import { toStringArray } from '@/features/assistant/context'
import {
  CONCEPT_DIRECTIONS,
  IMAGE_PRESETS,
  buildAnglePrompt,
  buildConceptPrompt,
  buildEditPrompt,
} from '@/prompts/image-prompts'
import { loadImageBytes, persistImage } from './service'
import type { JobHandler } from '@/jobs/types'

const projectPayload = z.object({ projectId: z.string() })

async function loadProduct(projectId: string) {
  const product = await db.product.findUnique({
    where: { projectId },
    include: { images: { where: { isAnchor: true }, take: 1 } },
  })
  if (!product) throw new Error('商品情報が見つかりません')
  return product
}

function describe(product: {
  name: string
  category: string | null
  description: string | null
  material: string | null
  color: string | null
  size: string | null
  features: unknown
}) {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    material: product.material,
    color: product.color,
    size: product.size,
    features: toStringArray(product.features),
  }
}

/** STEP 2: コンセプト3案を生成する(要件14, 15)。 */
const generateConcepts: JobHandler = async (context) => {
  const { projectId } = projectPayload.parse(context.payload)
  const product = await loadProduct(projectId)
  const chain = await imageChainFor(context.organizationId)
  const description = describe(product)

  const set = await db.$transaction(async (tx) => {
    await tx.productImageSet.updateMany({
      where: { productId: product.id, kind: 'CONCEPT' },
      data: { isCurrent: false },
    })
    return tx.productImageSet.create({
      data: {
        productId: product.id,
        kind: 'CONCEPT',
        label: 'コンセプト3案',
        provider: chain[0]?.id ?? 'mock',
        isCurrent: true,
        metadata: { directions: CONCEPT_DIRECTIONS.map((direction) => direction.label) },
      },
    })
  })

  // 3案は互いに独立のため並列生成する(所要時間 約1/3)
  let completedCount = 0
  const outcomes = await Promise.all(
    CONCEPT_DIRECTIONS.map(async (direction) => {
      const prompt = buildConceptPrompt(description, direction)
      const outcome = await runWithFallback(chain, (provider) =>
        provider.generate({
          prompt,
          count: 1,
          aspectRatio: '1:1',
          seed: `${product.id}:${direction.variant}`,
          variantLabels: [direction.variant],
        }),
      )
      completedCount += 1
      await context.setProgress((completedCount / CONCEPT_DIRECTIONS.length) * 90)
      return { direction, outcome }
    }),
  )

  const created: string[] = []
  for (const { direction, outcome } of outcomes) {
    await recordUsage({
      organizationId: context.organizationId,
      projectId,
      jobId: context.jobId,
      purpose: 'image.concept',
      usage: outcome.ok ? outcome.usage : { ...outcome.usage, failed: true, error: outcome.error.message },
    })
    if (!outcome.ok) throw new AppError('PROVIDER_ERROR', `コンセプト画像の生成に失敗しました: ${outcome.error.message}`)

    const image = outcome.data[0]
    if (image) {
      const saved = await persistImage({
        productId: product.id,
        projectId,
        imageSetId: set.id,
        type: 'CONCEPT',
        provider: outcome.usage.provider,
        model: outcome.usage.model,
        image: { ...image, variant: direction.variant },
      })
      created.push(saved.id)
    }
  }
  await context.setProgress(100)

  await advanceStage(projectId, 'IMAGE')
  return { imageSetId: set.id, imageIds: created }
}

/** STEP 2: アンカー画像を基準に8方向を生成する(要件17)。 */
const generateMultiAngle: JobHandler = async (context) => {
  const { projectId } = projectPayload.parse(context.payload)
  const product = await loadProduct(projectId)
  const anchor = product.images[0]
  if (!anchor) throw new Error('アンカー画像が選択されていません')

  const anchorBytes = await loadImageBytes(anchor.url)
  if (!anchorBytes) throw new Error('アンカー画像を読み込めませんでした')

  const chain = await imageChainFor(context.organizationId)
  const description = describe(product)
  const productDescription = [description.name, description.category, description.material, description.color]
    .filter((value): value is string => Boolean(value))
    .join(' / ')

  const set = await db.$transaction(async (tx) => {
    await tx.productImageSet.updateMany({
      where: { productId: product.id, kind: 'MULTI_ANGLE' },
      data: { isCurrent: false },
    })
    return tx.productImageSet.create({
      data: {
        productId: product.id,
        kind: 'MULTI_ANGLE',
        label: '360度ビュー(8方向)',
        provider: chain[0]?.id ?? 'mock',
        isCurrent: true,
        metadata: { anchorImageId: anchor.id },
      },
    })
  })

  const outcome = await runWithFallback(chain, (provider) =>
    provider.multiAngle({
      anchor: anchorBytes,
      productDescription,
      angles: IMAGE_ANGLES,
      seed: `${product.id}:anchor:${anchor.id}`,
    }),
  )

  await recordUsage({
    organizationId: context.organizationId,
    projectId,
    jobId: context.jobId,
    purpose: 'image.multi-angle',
    usage: outcome.ok ? outcome.usage : { ...outcome.usage, failed: true, error: outcome.error.message },
  })

  if (!outcome.ok) throw new AppError('PROVIDER_ERROR', `角度画像の生成に失敗しました: ${outcome.error.message}`)

  const ids: string[] = []
  for (const [index, image] of outcome.data.entries()) {
    const saved = await persistImage({
      productId: product.id,
      projectId,
      imageSetId: set.id,
      type: 'ANGLE',
      provider: outcome.usage.provider,
      model: outcome.usage.model,
      image: {
        ...image,
        angle: image.angle ?? IMAGE_ANGLES[index] ?? 'FRONT',
        prompt: image.prompt || buildAnglePrompt(productDescription, ANGLE_LABEL[IMAGE_ANGLES[index] ?? 'FRONT']),
      },
    })
    ids.push(saved.id)
    await context.setProgress(((index + 1) / outcome.data.length) * 100)
  }

  return { imageSetId: set.id, imageIds: ids }
}

const presetPayload = z.object({ projectId: z.string(), presetId: z.string() })

/** 商品画像の種類別生成(要件19)。 */
const generatePreset: JobHandler = async (context) => {
  const payload = presetPayload.parse(context.payload)
  const preset = IMAGE_PRESETS.find((item) => item.id === payload.presetId)
  if (!preset) throw new Error(`未知の画像プリセットです: ${payload.presetId}`)

  const product = await loadProduct(payload.projectId)
  const anchor = product.images[0]
  const anchorBytes = anchor ? await loadImageBytes(anchor.url) : null
  const description = describe(product)
  const chain = await imageChainFor(context.organizationId)

  const prompt = `${buildConceptPrompt(description, {
    variant: 'A',
    label: preset.label,
    description: preset.description,
  })}\n\nShot requirement: ${preset.prompt}`

  const outcome = await runWithFallback(chain, (provider) =>
    provider.generate({
      prompt,
      count: 1,
      aspectRatio: preset.aspectRatio,
      seed: `${product.id}:${preset.id}`,
      referenceImages: anchorBytes ? [anchorBytes] : undefined,
    }),
  )

  await recordUsage({
    organizationId: context.organizationId,
    projectId: payload.projectId,
    jobId: context.jobId,
    purpose: `image.${preset.id.toLowerCase()}`,
    usage: outcome.ok ? outcome.usage : { ...outcome.usage, failed: true, error: outcome.error.message },
  })

  if (!outcome.ok) throw new AppError('PROVIDER_ERROR', `画像生成に失敗しました: ${outcome.error.message}`)

  const image = outcome.data[0]
  if (!image) throw new Error('画像が返却されませんでした')

  const saved = await persistImage({
    productId: product.id,
    projectId: payload.projectId,
    imageSetId: null,
    type: toImageKind(preset.id),
    provider: outcome.usage.provider,
    model: outcome.usage.model,
    image,
  })
  return { imageId: saved.id }
}

const editPayload = z.object({
  projectId: z.string(),
  imageId: z.string(),
  presetId: z.string(),
  value: z.string(),
})

/** 画像編集(要件20)。元画像は残し、新しい画像として保存する(要件112)。 */
const editImage: JobHandler = async (context) => {
  const payload = editPayload.parse(context.payload)
  const source = await db.productImage.findUnique({ where: { id: payload.imageId } })
  if (!source) throw new Error('編集対象の画像が見つかりません')

  const bytes = await loadImageBytes(source.url)
  if (!bytes) throw new Error('元画像を読み込めませんでした')

  const chain = await imageChainFor(context.organizationId)
  const instruction = buildEditPrompt(payload.presetId, payload.value)

  const outcome = await runWithFallback(chain, (provider) =>
    provider.edit({ base: bytes, instruction, seed: `${source.id}:${payload.presetId}:${payload.value}` }),
  )

  await recordUsage({
    organizationId: context.organizationId,
    projectId: payload.projectId,
    jobId: context.jobId,
    purpose: 'image.edit',
    usage: outcome.ok ? outcome.usage : { ...outcome.usage, failed: true, error: outcome.error.message },
  })

  if (!outcome.ok) throw new AppError('PROVIDER_ERROR', `画像編集に失敗しました: ${outcome.error.message}`)

  const saved = await persistImage({
    productId: source.productId,
    projectId: payload.projectId,
    imageSetId: null,
    type: 'EDIT',
    provider: outcome.usage.provider,
    model: outcome.usage.model,
    image: { ...outcome.data, variant: payload.presetId } satisfies GeneratedImage,
  })

  return { imageId: saved.id, sourceImageId: source.id }
}

function toImageKind(presetId: string) {
  switch (presetId) {
    case 'PRODUCT_ONLY':
    case 'WHITE_BG':
    case 'TRANSPARENT':
    case 'LIFESTYLE':
    case 'LUXURY':
    case 'AMAZON_MAIN':
    case 'AMAZON_SUB':
    case 'SNS':
    case 'LP':
      return presetId
    default:
      return 'PRODUCT_ONLY'
  }
}

export const imageJobHandlers: Record<string, JobHandler> = {
  'images.concepts': generateConcepts,
  'images.multiAngle': generateMultiAngle,
  'images.preset': generatePreset,
  'images.edit': editImage,
}
