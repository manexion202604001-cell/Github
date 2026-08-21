import type { JobKind } from '@prisma/client'

export type JobContext = {
  jobId: string
  organizationId: string
  projectId: string | null
  payload: unknown
  /** 0..100 の進捗を更新する。 */
  setProgress: (value: number) => Promise<void>
}

export type JobHandler = (context: JobContext) => Promise<unknown>

export type EnqueueInput = {
  organizationId: string
  projectId?: string | null
  kind: JobKind
  handler: string
  payload: unknown
  createdBy?: string | null
  maxAttempts?: number
}
