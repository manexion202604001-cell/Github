import 'server-only'
import type { AspectRatio, VideoPurpose, VideoType } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'
import { videoProviders } from '@/providers/video'
import { aspectRatioToString } from './constants'

export { aspectRatioToString }

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
