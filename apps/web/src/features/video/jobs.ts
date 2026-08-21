import 'server-only'
import { z } from 'zod'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { runAITask } from '@/server/ai-task'
import { videoStoryboardTask } from '@/prompts/video-storyboard'
import { videoPromptTask } from '@/prompts/video-prompt'
import { videoProviders } from '@/providers/video'
import { runWithFallback } from '@/providers/registry'
import { recordUsage } from '@/server/usage'
import { storage, buildKey, extensionForMime } from '@/providers/storage'
import { buildProjectContext } from '@/features/assistant/context'
import { advanceStage } from '@/features/projects/service'
import { loadImageBytes } from '@/features/images/service'
import { aspectRatioToString } from './service'
import type { JobHandler } from '@/jobs/types'

const storyboardPayload = z.object({ projectId: z.string(), videoProjectId: z.string() })

/** STEP 11: 動画戦略 → コンセプト → 絵コンテ → 台本 → 生成プロンプト(要件59〜63)。 */
const buildStoryboard: JobHandler = async (context) => {
  const payload = storyboardPayload.parse(context.payload)
  const videoProject = await db.videoProject.findUnique({ where: { id: payload.videoProjectId } })
  if (!videoProject) throw new Error('動画プロジェクトが見つかりません')

  const snapshot = await buildProjectContext(payload.projectId)
  const aspect = aspectRatioToString(videoProject.aspectRatio)
  await context.setProgress(20)

  const storyboard = await runAITask(
    videoStoryboardTask,
    {
      context: snapshot,
      purpose: videoProject.purpose,
      videoType: videoProject.videoType,
      durationSec: videoProject.durationSec,
      aspectRatio: aspect,
    },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )
  await context.setProgress(60)

  const prompts = await runAITask(
    videoPromptTask,
    {
      productName: snapshot.product?.name ?? 'product',
      productDescription: snapshot.product?.description ?? '',
      aspectRatio: aspect,
      scenes: storyboard.data.scenes.map((scene) => ({
        order: scene.order,
        role: scene.role,
        description: scene.description,
        caption: scene.caption,
      })),
    },
    { organizationId: context.organizationId, projectId: payload.projectId, jobId: context.jobId },
  )

  const promptByOrder = new Map(prompts.data.prompts.map((item) => [item.order, item]))

  await db.$transaction([
    db.videoScene.deleteMany({ where: { videoProjectId: payload.videoProjectId } }),
    db.videoProject.update({
      where: { id: payload.videoProjectId },
      data: {
        strategy: storyboard.data.strategy,
        concept: storyboard.data.concept,
        script: storyboard.data.script,
        rawData: { synthetic: storyboard.synthetic },
      },
    }),
    db.videoScene.createMany({
      data: storyboard.data.scenes.map((scene) => ({
        videoProjectId: payload.videoProjectId,
        order: scene.order,
        startSec: scene.startSec,
        endSec: scene.endSec,
        role: scene.role,
        description: scene.description,
        narration: scene.narration,
        caption: scene.caption,
        cameraNote: scene.cameraNote,
        prompt: promptByOrder.get(scene.order)?.prompt ?? null,
      })),
    }),
  ])

  await advanceStage(payload.projectId, 'VIDEO')
  return { scenes: storyboard.data.scenes.length, synthetic: storyboard.synthetic }
}

const scenePayload = z.object({ projectId: z.string(), sceneId: z.string() })
const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 200

/** シーン単位で外部Video Providerへ生成を依頼し、完了までポーリングする(要件64〜67)。 */
const generateScene: JobHandler = async (context) => {
  const payload = scenePayload.parse(context.payload)
  const scene = await db.videoScene.findUnique({
    where: { id: payload.sceneId },
    include: { videoProject: true },
  })
  if (!scene) throw new Error('シーンが見つかりません')
  if (!scene.prompt) throw new Error('シーンの生成プロンプトがありません。先にストーリーボードを生成してください。')

  const chain = videoProviders().chain()
  const aspect = aspectRatioToString(scene.videoProject.aspectRatio)
  const durationSec = Math.max(3, Math.round(scene.endSec - scene.startSec))

  // 商品画像をimage-to-videoの参照として渡す。
  const product = await db.product.findUnique({
    where: { projectId: payload.projectId },
    include: { images: { where: { isAnchor: true }, take: 1 } },
  })
  const anchorUrl = product?.images[0]?.url
  const anchorBytes = anchorUrl ? await loadImageBytes(anchorUrl) : null

  const videoJob = await db.videoJob.create({
    data: {
      videoProjectId: scene.videoProjectId,
      sceneId: scene.id,
      jobId: context.jobId,
      provider: chain[0]?.id ?? 'mock',
      status: 'QUEUED',
      prompt: scene.prompt,
      images: anchorUrl ? [anchorUrl] : [],
      durationSec,
      aspectRatio: scene.videoProject.aspectRatio,
    },
  })

  const start = await runWithFallback(chain, (provider) =>
    provider.generate({
      prompt: scene.prompt ?? '',
      durationSec,
      aspectRatio: aspect,
      images: anchorBytes ? [anchorBytes] : undefined,
      sceneRef: scene.id,
    }),
  )

  await recordUsage({
    organizationId: context.organizationId,
    projectId: payload.projectId,
    jobId: context.jobId,
    purpose: 'video.generate',
    usage: start.ok ? start.usage : { ...start.usage, failed: true, error: start.error.message },
  })

  if (!start.ok) {
    await db.videoJob.update({
      where: { id: videoJob.id },
      data: { status: 'FAILED', error: start.error.message },
    })
    throw new AppError('PROVIDER_ERROR', `動画生成の開始に失敗しました: ${start.error.message}`)
  }

  const provider = videoProviders().get(start.usage.provider)
  await db.videoJob.update({
    where: { id: videoJob.id },
    data: { status: 'GENERATING', providerJobId: start.data.providerJobId, provider: provider.id },
  })

  // Webhook非対応Providerのためのポーリング(要件95)。
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const current = await db.videoJob.findUnique({ where: { id: videoJob.id }, select: { status: true } })
    if (current?.status === 'CANCELLED') return { videoJobId: videoJob.id, status: 'CANCELLED' }

    const state = await provider.getJob(start.data.providerJobId)
    if (!state.ok) {
      await db.videoJob.update({ where: { id: videoJob.id }, data: { error: state.error.message } })
      if (!state.error.retryable) {
        await db.videoJob.update({ where: { id: videoJob.id }, data: { status: 'FAILED' } })
        throw new AppError('PROVIDER_ERROR', `動画生成に失敗しました: ${state.error.message}`)
      }
      continue
    }

    await context.setProgress(state.data.progress ?? Math.min(95, 10 + attempt * 5))

    if (state.data.status === 'FAILED') {
      await db.videoJob.update({
        where: { id: videoJob.id },
        data: { status: 'FAILED', error: state.data.error ?? '不明なエラー' },
      })
      throw new AppError('PROVIDER_ERROR', `動画生成に失敗しました: ${state.data.error ?? '不明なエラー'}`)
    }

    if (state.data.status === 'CANCELLED') {
      await db.videoJob.update({ where: { id: videoJob.id }, data: { status: 'CANCELLED' } })
      return { videoJobId: videoJob.id, status: 'CANCELLED' }
    }

    if (state.data.status === 'COMPLETED') {
      let videoUrl = state.data.videoUrl ?? null

      if (state.data.asset) {
        const extension = extensionForMime(state.data.asset.mimeType)
        const stored = await storage().put({
          key: buildKey(['projects', payload.projectId, 'videos', videoJob.id], extension),
          body: Buffer.from(state.data.asset.base64, 'base64'),
          contentType: state.data.asset.mimeType,
        })
        videoUrl = stored.url
      }

      await db.videoJob.update({
        where: { id: videoJob.id },
        data: {
          status: 'COMPLETED',
          videoUrl,
          thumbnailUrl: videoUrl,
          costMicro: state.usage.estimatedCostMicro,
          completedAt: new Date(),
        },
      })
      return { videoJobId: videoJob.id, status: 'COMPLETED', videoUrl }
    }
  }

  await db.videoJob.update({
    where: { id: videoJob.id },
    data: { status: 'FAILED', error: '生成がタイムアウトしました' },
  })
  throw new Error('動画生成がタイムアウトしました')
}

export const videoJobHandlers: Record<string, JobHandler> = {
  'video.storyboard': buildStoryboard,
  'video.generateScene': generateScene,
}
