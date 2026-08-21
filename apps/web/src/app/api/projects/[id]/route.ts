import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { updateProjectSchema } from '@/features/projects/schema'
import { archiveProject, getProject, updateProject } from '@/features/projects/service'

type Context = { params: Promise<{ id: string }> }

export const GET = apiHandler<Context>(async (_request: NextRequest, context) => {
  const { id } = await context.params
  return jsonOk(await getProject(id))
})

export const PATCH = apiHandler<Context>(async (request, context) => {
  const { id } = await context.params
  const input = await parseBody(request, updateProjectSchema)
  return jsonOk(await updateProject(id, input))
})

export const DELETE = apiHandler<Context>(async (_request, context) => {
  const { id } = await context.params
  await archiveProject(id)
  return jsonOk({ ok: true })
})
