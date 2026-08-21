import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { requeueStaleJobs, runJob } from '@/jobs/queue'
import { db } from '@/server/db'
import { logger } from '@/lib/logger'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Job掃除(Vercel Cron / 外部cronから呼ぶ)。
 * - PROCESSINGのまま止まったJobをQUEUEDへ戻す(要件109 Job Retry)
 * - QUEUEDのまま実行されていないJobを直列で数件実行する
 *   (サーバーレスでafter()実行が失われた場合の救済)
 * 認証: Vercel Cron の場合は Authorization: Bearer CRON_SECRET 互換、
 * もしくは JOB_WORKER_TOKEN が一致する場合のみ許可。
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  const cronSecret = process.env.CRON_SECRET ?? ''
  const workerToken = env.jobs.workerToken

  // x-vercel-cron ヘッダはクライアントが偽装できるため認可判定には使わない。
  // CRON_SECRET(Vercel Cronが自動でBearer送信)か JOB_WORKER_TOKEN の一致を必須とする。
  if (!cronSecret && !workerToken) {
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'CRON_SECRET が未設定のため無効です' } },
      { status: 503 },
    )
  }
  const authorized = (cronSecret !== '' && token === cronSecret) || (workerToken !== '' && token === workerToken)
  if (!authorized) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'unauthorized' } }, { status: 401 })
  }

  const requeued = await requeueStaleJobs(10 * 60 * 1000)

  // 溜まっているQUEUEDを最大3件だけ実行(60秒制限内に収める)
  const pending = await db.job.findMany({
    where: { status: { in: ['PENDING', 'QUEUED'] }, runAfter: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 3,
    select: { id: true },
  })
  for (const job of pending) {
    try {
      await runJob(job.id)
    } catch (error) {
      logger.error('sweep.job_failed', { jobId: job.id, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return NextResponse.json({ data: { requeued, executed: pending.length } })
}
