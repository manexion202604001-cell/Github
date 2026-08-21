import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { createProjectSchema } from '@/features/projects/schema'
import { createProject, listProjects } from '@/features/projects/service'

export const GET = apiHandler(async () => {
  return jsonOk(await listProjects())
})

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, createProjectSchema)
  const project = await createProject(input)
  return jsonOk(project, { status: 201 })
})
