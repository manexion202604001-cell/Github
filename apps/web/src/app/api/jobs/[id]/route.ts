import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk } from '@/server/api'
import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { requireOrganization, requireProjectAccess } from '@/server/authz'
import { cancelJob } from '@/jobs/queue'

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
      result: true,
      error: true,
      createdAt: true,
      completedAt: true,
    },
  })
  if (!job) throw AppError.notFound('ジョブが見つかりません')

  if (job.projectId) await requireProjectAccess(job.projectId)
  else await requireOrganization(job.organizationId)

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
