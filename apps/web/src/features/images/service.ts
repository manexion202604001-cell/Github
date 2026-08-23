import 'server-only'
import type { ImageKind } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/server/audit'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { storage, buildKey, extensionForMime } from '@/providers/storage'
import type { GeneratedImage } from '@/providers/image'
import { imageChainFor } from '@/server/org-providers'

/**
 * この組織で実際に使われる画像Providerの状態。
 * 環境変数だけでなくBYOK(設定画面のキー)も考慮する。
 */
export async function imageProviderStatus(projectId: string): Promise<{ provider: string; synthetic: boolean }> {
  const context = await requireProjectAccess(projectId)
  const chain = await imageChainFor(context.organizationId)
  const first = chain[0]
  return { provider: first?.id ?? 'mock', synthetic: first?.synthetic ?? true }
}

export async function listImages(projectId: string) {
  await requireProjectAccess(projectId)
  const product = await db.product.findUnique({ where: { projectId }, select: { id: true } })
  if (!product) return { concepts: [], anchor: null, angles: [], others: [], sets: [] }

  const [images, sets] = await Promise.all([
    db.productImage.findMany({ where: { productId: product.id }, orderBy: { createdAt: 'desc' } }),
    db.productImageSet.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { images: true } } },
    }),
  ])

  const currentConceptSet = sets.find((set) => set.kind === 'CONCEPT' && set.isCurrent)
  const currentAngleSet = sets.find((set) => set.kind === 'MULTI_ANGLE' && set.isCurrent)

  return {
    concepts: images.filter((image) => image.type === 'CONCEPT' && (!currentConceptSet || image.imageSetId === currentConceptSet.id)),
    anchor: images.find((image) => image.isAnchor) ?? null,
    angles: images
      .filter((image) => image.type === 'ANGLE' && (!currentAngleSet || image.imageSetId === currentAngleSet.id))
      .sort((a, b) => ANGLE_ORDER.indexOf(a.angle ?? 'FRONT') - ANGLE_ORDER.indexOf(b.angle ?? 'FRONT')),
    others: images.filter((image) => image.type !== 'CONCEPT' && image.type !== 'ANGLE'),
    sets,
  }
}

const ANGLE_ORDER = ['FRONT', 'FRONT_RIGHT', 'RIGHT', 'BACK_RIGHT', 'BACK', 'BACK_LEFT', 'LEFT', 'FRONT_LEFT']

/** ラフなイメージ入力(全項目任意)。AIブリーフ化してコンセプト生成に使う。 */
export type ConceptIdeaInput = {
  rawIdea?: string
  category?: string
  target?: string
  priceRange?: string
  color?: string
  taste?: string
  brand?: string
  notes?: string
}

export async function generateConcepts(projectId: string, idea?: ConceptIdeaInput) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'IMAGE',
    handler: 'images.concepts',
    payload: { projectId, idea: idea ?? null },
    createdBy: context.user.id,
  })
}

/** 選択した1枚をアンカー画像として確定する(要件16)。 */
export async function selectAnchor(projectId: string, imageId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const image = await db.productImage.findUnique({ where: { id: imageId }, include: { product: true } })
  if (!image || image.product.projectId !== projectId) throw AppError.notFound('画像が見つかりません')

  await db.$transaction([
    db.productImage.updateMany({ where: { productId: image.productId, isAnchor: true }, data: { isAnchor: false } }),
    db.productImage.update({ where: { id: imageId }, data: { isAnchor: true, type: 'ANCHOR' } }),
  ])

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'image.select_anchor',
    entityType: 'ProductImage',
    entityId: imageId,
    summary: 'アンカー画像を選択',
  })

  return image
}

export async function generateAngles(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const product = await db.product.findUnique({
    where: { projectId },
    include: { images: { where: { isAnchor: true }, take: 1 } },
  })
  if (!product) throw AppError.notFound('商品情報が見つかりません')
  if (product.images.length === 0) {
    throw AppError.validation('先にアンカー画像を選択してください。角度による形状のブレを防ぐために必要です。')
  }

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'IMAGE',
    handler: 'images.multiAngle',
    payload: { projectId },
    createdBy: context.user.id,
  })
}

/** 失敗・不満のある角度だけを1枚再生成する(全件やり直し不要)。 */
export async function generateSingleAngle(projectId: string, angle: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const product = await db.product.findUnique({
    where: { projectId },
    include: { images: { where: { isAnchor: true }, take: 1 } },
  })
  if (!product) throw AppError.notFound('商品情報が見つかりません')
  if (product.images.length === 0) {
    throw AppError.validation('先にアンカー画像を選択してください。')
  }
  if (!ANGLE_ORDER.includes(angle)) {
    throw AppError.validation(`未知の角度です: ${angle}`)
  }

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'IMAGE',
    handler: 'images.singleAngle',
    payload: { projectId, angle },
    createdBy: context.user.id,
  })
}

export async function generatePreset(projectId: string, presetId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'IMAGE',
    handler: 'images.preset',
    payload: { projectId, presetId },
    createdBy: context.user.id,
  })
}

export async function editImage(projectId: string, input: { imageId: string; presetId: string; value: string }) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const image = await db.productImage.findUnique({ where: { id: input.imageId }, include: { product: true } })
  if (!image || image.product.projectId !== projectId) throw AppError.notFound('画像が見つかりません')

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'IMAGE',
    handler: 'images.edit',
    payload: { projectId, imageId: input.imageId, presetId: input.presetId, value: input.value },
    createdBy: context.user.id,
  })
}

/**
 * 生成画像を Object Storage に保存し、DBにはURLとMetadataのみを持つ(要件85)。
 */
export async function persistImage(input: {
  productId: string
  projectId: string
  imageSetId: string | null
  type: ImageKind
  provider: string
  model: string | null
  image: GeneratedImage
}) {
  const extension = extensionForMime(input.image.mimeType)
  const key = buildKey(
    ['projects', input.projectId, 'images', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`],
    extension,
  )

  const stored = await storage().put({
    key,
    body: Buffer.from(input.image.base64, 'base64'),
    contentType: input.image.mimeType,
    cacheControl: 'public, max-age=31536000, immutable',
  })

  return db.productImage.create({
    data: {
      productId: input.productId,
      imageSetId: input.imageSetId,
      type: input.type,
      angle: input.image.angle ?? null,
      variant: input.image.variant ?? null,
      url: stored.url,
      provider: input.provider,
      model: input.model,
      prompt: input.image.prompt,
      seed: input.image.seed ?? null,
      width: input.image.width ?? null,
      height: input.image.height ?? null,
      metadata: { mimeType: input.image.mimeType, size: stored.size, storageKey: stored.key },
    },
  })
}

/** 保存済み画像をProviderへ渡せる形(base64)で読み戻す。 */
export async function loadImageBytes(url: string): Promise<{ base64: string; mimeType: string } | null> {
  const match = /^\/api\/files\/(.+)$/.exec(url)
  if (match?.[1]) {
    const key = match[1].split('/').map(decodeURIComponent).join('/')
    const object = await storage().get(key)
    if (!object) return null
    return { base64: object.body.toString('base64'), mimeType: object.contentType }
  }

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    return { base64: buffer.toString('base64'), mimeType: response.headers.get('content-type') ?? 'image/png' }
  } catch {
    return null
  }
}
