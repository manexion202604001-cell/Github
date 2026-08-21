import { listVideoProjects, videoProviderInfo } from '@/features/video/service'
import { VideoWorkspace } from './video-workspace'

/** STEP 11: PR動画(要件58〜68)。 */
export default async function VideoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [videoProjects, provider] = [await listVideoProjects(projectId), videoProviderInfo()]

  return (
    <VideoWorkspace
      projectId={projectId}
      providerSynthetic={provider.synthetic}
      videos={videoProjects.map((video) => ({
        id: video.id,
        title: video.title,
        purpose: video.purpose,
        videoType: video.videoType,
        durationSec: video.durationSec,
        aspectRatio: video.aspectRatio,
        strategy: video.strategy,
        concept: video.concept,
        script: video.script,
        scenes: video.scenes.map((scene) => ({
          id: scene.id,
          order: scene.order,
          startSec: scene.startSec,
          endSec: scene.endSec,
          role: scene.role,
          description: scene.description,
          narration: scene.narration,
          caption: scene.caption,
          prompt: scene.prompt,
        })),
        jobs: video.jobs.map((job) => ({
          id: job.id,
          sceneId: job.sceneId,
          status: job.status,
          videoUrl: job.videoUrl,
          error: job.error,
        })),
      }))}
    />
  )
}
