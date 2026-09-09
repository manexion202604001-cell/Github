'use client'
import { useEffect, useRef, useState } from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'
import { updateLessonProgress } from '@/lib/actions/learn'
import { isVideoWatched } from '@/lib/xp'
import { toast } from '@/components/ui/Toaster'

/**
 * LEARN-03: YouTube（privacy-enhanced）埋め込み。
 * 再生位置を 10 秒ごとに保存し、90% 視聴で自動完了。
 */
export function VideoPlayer({ lessonId, videoId, startSec, completed }: { lessonId: string; videoId: string; startSec: number; completed: boolean }) {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const [done, setDone] = useState(completed)
  const doneRef = useRef(completed)
  const lastSavedRef = useRef(0)

  useEffect(() => {
    doneRef.current = done
  }, [done])

  useEffect(() => {
    const timer = setInterval(async () => {
      const p = playerRef.current
      if (!p) return
      try {
        const [pos, dur, state] = await Promise.all([p.getCurrentTime(), p.getDuration(), p.getPlayerState()])
        if (state !== 1) return // 再生中のみ
        const position = Math.floor(pos)
        if (Math.abs(position - lastSavedRef.current) < 10 && !(isVideoWatched(pos, dur) && !doneRef.current)) return
        lastSavedRef.current = position
        const shouldComplete = !doneRef.current && isVideoWatched(pos, dur)
        const r = await updateLessonProgress(lessonId, { positionSec: position, complete: shouldComplete })
        if (r.ok && shouldComplete && r.data.completed) {
          setDone(true)
          toast(r.data.courseCompleted ? 'コースを修了しました。' : 'レッスンを完了しました。')
        }
      } catch {
        /* プレイヤー未準備 */
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [lessonId])

  const onReady = (e: YouTubeEvent) => {
    playerRef.current = e.target
    if (startSec > 5) e.target.seekTo(startSec, true)
  }
  const onEnd = async () => {
    if (doneRef.current) return
    const r = await updateLessonProgress(lessonId, { complete: true })
    if (r.ok && r.data.completed) {
      setDone(true)
      toast(r.data.courseCompleted ? 'コースを修了しました。' : 'レッスンを完了しました。')
    }
  }
  const onPause = async (e: YouTubeEvent) => {
    try {
      const pos = Math.floor(await e.target.getCurrentTime())
      lastSavedRef.current = pos
      await updateLessonProgress(lessonId, { positionSec: pos })
    } catch {
      /* noop */
    }
  }

  return (
    <div className="aspect-video w-full bg-ink-900">
      <YouTube
        videoId={videoId}
        className="size-full"
        iframeClassName="size-full"
        opts={{
          host: 'https://www.youtube-nocookie.com',
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: startSec > 5 ? startSec : 0 },
        }}
        onReady={onReady}
        onEnd={onEnd}
        onPause={onPause}
      />
    </div>
  )
}
