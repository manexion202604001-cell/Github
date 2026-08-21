import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk } from '@/server/api'
import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { requireOrganization, requireProjectAccess } from '@/server/authz'
import { after } from 'next/server'
import { cancelJob, runJob } from '@/jobs/queue'
import { logger } from '@/lib/logger'

type Context = { params: Promise<{ id: string }> }

/** Job共通のステータス取得。クライアントはこれをポーリングする。 */
export const GET = apiHandler<Context>(async (_request: NextRequest, context) => {
  const { id } = await context.params
  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      kind: true,
      handler: true,
      status: true,
      progress: true,
      attempts: true,
      maxAttempts: true,
      updatedAt: true,
      result: true,
      error: true,
      createdAt: true,
      completedAt: true,
    },
  })
  if (!job) throw AppError.notFound('ジョブが見つかりません')

  if (job.projectId) await requireProjectAccess(job.projectId)
  else await requireOrganization(job.organizationId)

  // 自己修復: サーバーレス関数が途中で落ちると PROCESSING のまま止まる。
  // 進捗更新(updatedAt)が150秒以上途絶えたJobは、ポーリングを契機に再実行する。
  if (job.status === 'PROCESSING' && Date.now() - job.updatedAt.getTime() > 150_000) {
    if (job.attempts >= job.maxAttempts) {
      await db.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: '処理がタイムアウトしました。もう一度実行してください。', completedAt: new Date() },
      })
      return jsonOk({ ...job, status: 'FAILED', error: '処理がタイムアウトしました。もう一度実行してください。' })
    }
    logger.warn('job.self_heal', { jobId: job.id, handler: job.handler, attempts: job.attempts })
    await db.job.update({
      where: { id: job.id },
      data: { status: 'QUEUED', lockedAt: null, lockedBy: null },
    })
    after(() =>
      runJob(job.id).catch((error: unknown) => {
        logger.error('job.self_heal_failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }),
    )
    return jsonOk({ ...job, status: 'QUEUED' })
  }

  return jsonOk(job)
})

export const DELETE = apiHandler<Context>(async (_request, context) => {
  const { id } = await context.params
  const job = await db.job.findUnique({ where: { id }, select: { projectId: true, organizationId: true } })
  if (!job) throw AppError.notFound('ジョブが見つかりません')
  if (job.projectId) await requireProjectAccess(job.projectId, 'EDITOR')
  else await requireOrganization(job.organizationId)

  await cancelJob(id)
  return jsonOk({ ok: true })
})
