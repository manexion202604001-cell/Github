'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { VIDEO_DURATIONS, VIDEO_PURPOSES, VIDEO_TYPES, ASPECT_RATIOS } from '@/features/video/constants'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Notice, Progress } from '@/components/ui/feedback'

type SceneView = {
  id: string
  order: number
  startSec: number
  endSec: number
  role: string
  description: string
  narration: string | null
  caption: string | null
  prompt: string | null
}

type VideoJobView = { id: string; sceneId: string | null; status: string; videoUrl: string | null; error: string | null }

type VideoView = {
  id: string
  title: string
  purpose: string
  videoType: string
  durationSec: number
  aspectRatio: string
  strategy: string | null
  concept: string | null
  script: string | null
  scenes: SceneView[]
  jobs: VideoJobView[]
}

export function VideoWorkspace({
  projectId,
  providerSynthetic,
  videos,
}: {
  projectId: string
  providerSynthetic: boolean
  videos: VideoView[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const job = useJob((finished) => {
    if (finished.status === 'FAILED') setError(finished.error ?? '処理に失敗しました')
    router.refresh()
  })

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    void api<{ jobId: string }>('/api/video/storyboard', {
      method: 'POST',
      body: {
        projectId,
        title: form.get('title'),
        purpose: form.get('purpose'),
        videoType: form.get('videoType'),
        durationSec: Number(form.get('durationSec')),
        aspectRatio: form.get('aspectRatio'),
      },
    })
      .then((result) => job.track(result.jobId))
      .catch((caught) => setError(caught instanceof Error ? caught.message : '開始できませんでした'))
  }

  const generateScene = (sceneId: string) => {
    setError(null)
    void api<{ jobId: string }>('/api/video/generate', { method: 'POST', body: { projectId, sceneId } })
      .then((result) => job.track(result.jobId))
      .catch((caught) => setError(caught instanceof Error ? caught.message : '開始できませんでした'))
  }

  return (
    <div className="space-y-5">
      {providerSynthetic ? (
        <Notice tone="warning" title="動画生成Providerが未設定です">
          外部動画AIとの契約後、VIDEO_PROVIDER を設定すると実際の動画が生成されます。現在はサンプル(アニメーションSVG)でフローを確認できます。
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {job.running && job.job ? (
        <Card>
          <CardBody className="space-y-2">
            <p className="text-[13px] font-semibold">処理中…(動画生成には時間がかかります)</p>
            <Progress value={job.job.progress} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="PR動画を企画する"
          description="用途・タイプ・尺・比率を選ぶと、AIが動画戦略 → ストーリーボード → 台本 → 生成プロンプトまで作成します。"
        />
        <CardBody>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="タイトル" className="lg:col-span-2">
              <Input name="title" required maxLength={120} placeholder="Amazon商品紹介 15秒" />
            </Field>
            <Field label="用途">
              <Select name="purpose" defaultValue="AMAZON">
                {VIDEO_PURPOSES.map((purpose) => (
                  <option key={purpose.value} value={purpose.value}>
                    {purpose.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="動画タイプ">
              <Select name="videoType" defaultValue="PRODUCT_INTRO">
                {VIDEO_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="尺">
                <Select name="durationSec" defaultValue="15">
                  {VIDEO_DURATIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration}秒
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="比率">
                <Select name="aspectRatio" defaultValue="RATIO_9_16">
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="self-end">
              <Button type="submit" disabled={job.running} className="w-full">
                ストーリーボードを生成
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {videos.length === 0 ? (
        <EmptyState title="動画企画はまだありません" description="上のフォームから最初のPR動画を企画しましょう。" />
      ) : (
        videos.map((video) => (
          <Card key={video.id}>
            <CardHeader
              title={video.title}
              description={`${video.purpose} / ${video.videoType} / ${video.durationSec}秒 / ${video.aspectRatio.replace('RATIO_', '').replace('_', ':')}`}
            />
            <CardBody className="space-y-4">
              {video.strategy ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-canvas px-4 py-3">
                    <p className="text-[12px] font-bold text-ink-subtle">戦略</p>
                    <p className="mt-1 text-[13px] leading-relaxed">{video.strategy}</p>
                  </div>
                  <div className="rounded-xl bg-canvas px-4 py-3">
                    <p className="text-[12px] font-bold text-ink-subtle">コンセプト</p>
                    <p className="mt-1 text-[13px] leading-relaxed">{video.concept}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-ink-muted">ストーリーボードを生成中です…画面を更新してください。</p>
              )}

              {video.scenes.length > 0 ? (
                <ol className="space-y-3">
                  {video.scenes.map((scene) => {
                    const sceneJob = video.jobs.find((item) => item.sceneId === scene.id)
                    return (
                      <li key={scene.id} className="rounded-xl border border-line p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone="brand">Scene {String(scene.order).padStart(2, '0')}</Badge>
                            <span className="text-[12px] text-ink-subtle">
                              {scene.startSec}〜{scene.endSec}秒 / {scene.role}
                            </span>
                            {sceneJob ? (
                              <Badge
                                tone={
                                  sceneJob.status === 'COMPLETED'
                                    ? 'positive'
                                    : sceneJob.status === 'FAILED'
                                      ? 'critical'
                                      : 'caution'
                                }
                              >
                                {sceneJob.status}
                              </Badge>
                            ) : null}
                          </div>
                          <Button size="sm" variant="secondary" disabled={job.running} onClick={() => generateScene(scene.id)}>
                            {sceneJob?.status === 'COMPLETED' ? 'このシーンを再生成' : 'このシーンを生成'}
                          </Button>
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed">{scene.description}</p>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-muted">
                          {scene.caption ? <span>テロップ: {scene.caption}</span> : null}
                          {scene.narration ? <span>ナレーション: {scene.narration}</span> : null}
                        </div>
                        {sceneJob?.videoUrl ? (
                          <div className="mt-3 max-w-60 overflow-hidden rounded-xl border border-line">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sceneJob.videoUrl} alt={`Scene ${scene.order}`} className="w-full" />
                          </div>
                        ) : null}
                        {sceneJob?.error ? <p className="mt-2 text-[12px] text-critical">{sceneJob.error}</p> : null}
                      </li>
                    )
                  })}
                </ol>
              ) : null}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  )
}
