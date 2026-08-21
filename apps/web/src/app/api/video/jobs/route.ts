import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk } from '@/server/api'
import { AppError } from '@/lib/errors'
import { listVideoProjects } from '@/features/video/service'

export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')
  return jsonOk(await listVideoProjects(projectId))
})
