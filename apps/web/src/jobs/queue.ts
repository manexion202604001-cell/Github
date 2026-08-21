import 'server-only'
import type { Job } from '@prisma/client'
import { db } from '@/server/db'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { getJobHandler } from './handlers'
import { ensureJobHandlersRegistered } from './register'
import type { EnqueueInput } from './types'

const BACKOFF_MS = [5_000, 30_000, 120_000]

/**
 * Job を作成する。生成AI処理はすべてここを通す(要件92)。
 * JOBS_INLINE=true の場合はレスポンスを待たせずに同一プロセスで実行を開始する。
 */
export async function enqueueJob(input: EnqueueInput): Promise<Job> {
  ensureJobHandlersRegistered()

  const job = await db.job.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      kind: input.kind,
      handler: input.handler,
      payload: JSON.parse(JSON.stringify(input.payload)),
      createdBy: input.createdBy ?? null,
      maxAttempts: input.maxAttempts ?? 3,
      status: 'QUEUED',
    },
  })

  if (env.jobs.inline) {
    // API はジョブIDを即返し、クライアントはポーリングする。
    // サーバーレス(Vercel等)ではレスポンス送信後にプロセスが凍結されるため、
    // next/server の after() で実行を予約する。それ以外の環境では fire-and-forget。
    const execute = () =>
      runJob(job.id).catch((error: unknown) => {
        logger.error('job.inline_failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    try {
      const { after } = await import('next/server')
      after(execute)
    } catch {
      void execute()
    }
  }

  return job
}

/** 未処理のJobを1件だけ排他的に取得する(複数Worker安全)。 */
export async function claimNextJob(workerId: string): Promise<Job | null> {
  const rows = await db.$queryRaw<Job[]>`
    UPDATE "Job"
    SET status = 'PROCESSING', "lockedAt" = now(), "lockedBy" = ${workerId},
        "startedAt" = COALESCE("startedAt", now()), "attempts" = "attempts" + 1
    WHERE id = (
      SELECT id FROM "Job"
      WHERE status IN ('PENDING', 'QUEUED') AND "runAfter" <= now()
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `
  return rows[0] ?? null
}

export async function runJob(jobId: string): Promise<void> {
  ensureJobHandlersRegistered()

  const claimed = await db.job.updateMany({
    where: { id: jobId, status: { in: ['PENDING', 'QUEUED'] } },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
      attempts: { increment: 1 },
      // lockedAt が無いと requeueStaleJobs の対象にならず、実行中に落ちたJobが永久に残る
      lockedAt: new Date(),
      lockedBy: 'inline',
    },
  })
  if (claimed.count === 0) return

  const job = await db.job.findUnique({ where: { id: jobId } })
  if (!job) return
  await executeJob(job)
}

export async function executeJob(job: Job): Promise<void> {
  ensureJobHandlersRegistered()
  const handler = getJobHandler(job.handler)

  if (!handler) {
    await failJob(job, `未登録のハンドラです: ${job.handler}`, false)
    return
  }

  const startedAt = Date.now()
  try {
    const result = await handler({
      jobId: job.id,
      organizationId: job.organizationId,
      projectId: job.projectId,
      payload: job.payload,
      setProgress: async (value: number) => {
        await db.job.update({
          where: { id: job.id },
          data: { progress: Math.max(0, Math.min(100, Math.round(value))) },
        })
      },
    })

    await db.job.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        result: result === undefined ? undefined : JSON.parse(JSON.stringify(result)),
        completedAt: new Date(),
        error: null,
      },
    })
    logger.info('job.completed', { jobId: job.id, handler: job.handler, ms: Date.now() - startedAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('job.failed', { jobId: job.id, handler: job.handler, error: message })
    await failJob(job, message, true)
  }
}

async function failJob(job: Job, message: string, retryable: boolean): Promise<void> {
  const shouldRetry = retryable && job.attempts < job.maxAttempts
  const delay = BACKOFF_MS[Math.min(job.attempts - 1, BACKOFF_MS.length - 1)] ?? 60_000

  await db.job.update({
    where: { id: job.id },
    data: shouldRetry
      ? { status: 'QUEUED', error: message, runAfter: new Date(Date.now() + delay), lockedAt: null, lockedBy: null }
      : { status: 'FAILED', error: message, completedAt: new Date() },
  })
}

export async function cancelJob(jobId: string): Promise<void> {
  await db.job.updateMany({
    where: { id: jobId, status: { in: ['PENDING', 'QUEUED', 'PROCESSING'] } },
    data: { status: 'CANCELLED', completedAt: new Date() },
  })
}

/** 一定時間 PROCESSING のまま止まっているJobを復帰させる。 */
export async function requeueStaleJobs(staleAfterMs = 10 * 60 * 1000): Promise<number> {
  const result = await db.job.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - staleAfterMs) } },
    data: { status: 'QUEUED', lockedAt: null, lockedBy: null },
  })
  return result.count
}
