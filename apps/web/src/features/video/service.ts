import 'server-only'
import type { AspectRatio, VideoPurpose, VideoType } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { videoProviders } from '@/providers/video'

export const VIDEO_PURPOSES: { value: VideoPurpose; label: string }[] = [
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'INSTAGRAM_REELS', label: 'Instagram Reels' },
  { value: 'YOUTUBE_SHORTS', label: 'YouTube Shorts' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'ADS', label: '広告' },
]

export const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: 'PRODUCT_INTRO', label: '商品紹介' },
  { value: 'UGC', label: 'UGC' },
  { value: 'PROBLEM_SOLVING', label: '問題解決' },
  { value: 'COMPARISON', label: '比較' },
  { value: 'LUXURY_BRAND', label: '高級ブランド' },
  { value: 'DEMONSTRATION', label: '実演' },
  { value: 'SNS_AD', label: 'SNS広告' },
]

export const VIDEO_DURATIONS = [5, 10, 15, 30, 60]

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: 'RATIO_9_16', label: '9:16(縦)' },
  { value: 'RATIO_16_9', label: '16:9(横)' },
  { value: 'RATIO_1_1', label: '1:1(正方形)' },
]

export function aspectRatioToString(value: AspectRatio): '9:16' | '16:9' | '1:1' {
  switch (value) {
    case 'RATIO_16_9':
      return '16:9'
    case 'RATIO_1_1':
      return '1:1'
    default:
      return '9:16'
  }
}

export async function listVideoProjects(projectId: string) {
  await requireProjectAccess(projectId)
  return db.videoProject.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      scenes: { orderBy: { order: 'asc' } },
      jobs: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function startStoryboard(
  projectId: string,
  input: { title: string; purpose: VideoPurpose; videoType: VideoType; durationSec: number; aspectRatio: AspectRatio },
) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const videoProject = await db.videoProject.create({
    data: {
      projectId,
      title: input.title,
      purpose: input.purpose,
      videoType: input.videoType,
      durationSec: input.durationSec,
      aspectRatio: input.aspectRatio,
    },
  })

  const job = await enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'video.storyboard',
    payload: { projectId, videoProjectId: videoProject.id },
    createdBy: context.user.id,
  })

  return { videoProject, job }
}

/** シーン単位で生成する。動画全体を毎回作り直さない(要件67)。 */
export async function generateScene(projectId: string, sceneId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const scene = await db.videoScene.findUnique({
    where: { id: sceneId },
    include: { videoProject: true },
  })
  if (!scene || scene.videoProject.projectId !== projectId) throw AppError.notFound('シーンが見つかりません')

  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'VIDEO',
    handler: 'video.generateScene',
    payload: { projectId, sceneId },
    createdBy: context.user.id,
  })
}

export async function cancelVideoJob(projectId: string, videoJobId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const videoJob = await db.videoJob.findUnique({
    where: { id: videoJobId },
    include: { videoProject: { select: { projectId: true } } },
  })
  if (!videoJob || videoJob.videoProject.projectId !== projectId) throw AppError.notFound('動画ジョブが見つかりません')

  if (videoJob.providerJobId) {
    const provider = videoProviders().get(videoJob.provider)
    await provider.cancel(videoJob.providerJobId)
  }

  await db.videoJob.update({ where: { id: videoJobId }, data: { status: 'CANCELLED' } })
  if (videoJob.jobId) {
    await db.job.updateMany({
      where: { id: videoJob.jobId, status: { in: ['PENDING', 'QUEUED', 'PROCESSING'] } },
      data: { status: 'CANCELLED', completedAt: new Date() },
    })
  }

  return { id: videoJobId, organizationId: context.organizationId }
}

export async function updateScene(
  projectId: string,
  sceneId: string,
  input: { description?: string; narration?: string | null; caption?: string | null; prompt?: string | null },
) {
  await requireProjectAccess(projectId, 'EDITOR')
  const scene = await db.videoScene.findUnique({
    where: { id: sceneId },
    include: { videoProject: { select: { projectId: true } } },
  })
  if (!scene || scene.videoProject.projectId !== projectId) throw AppError.notFound('シーンが見つかりません')
  return db.videoScene.update({ where: { id: sceneId }, data: input })
}

export function videoProviderInfo() {
  const provider = videoProviders().get()
  return { id: provider.id, synthetic: provider.synthetic }
}
