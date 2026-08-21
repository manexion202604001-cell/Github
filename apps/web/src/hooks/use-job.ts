'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

export type JobView = {
  id: string
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  result: unknown
  error: string | null
}

const POLL_MS = 1500
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])

/**
 * Jobのポーリング(要件92)。202で受け取った jobId を渡すと完了まで追跡する。
 * onComplete は完了時に一度だけ呼ばれる。
 */
export function useJob(onComplete?: (job: JobView) => void) {
  const [job, setJob] = useState<JobView | null>(null)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(onComplete)
  callbackRef.current = onComplete

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setRunning(false)
  }, [])

  const track = useCallback(
    (jobId: string) => {
      stop()
      setRunning(true)
      setJob({ id: jobId, status: 'QUEUED', progress: 0, result: null, error: null })

      const poll = async () => {
        try {
          const current = await api<JobView>(`/api/jobs/${jobId}`)
          setJob(current)
          if (TERMINAL.has(current.status)) {
            setRunning(false)
            callbackRef.current?.(current)
            return
          }
        } catch {
          // 一時的なネットワークエラーはポーリング継続
        }
        timer.current = setTimeout(poll, POLL_MS)
      }
      void poll()
    },
    [stop],
  )

  useEffect(() => stop, [stop])

  return { job, running, track, stop }
}
