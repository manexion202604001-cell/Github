import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { upsertIntegrationSchema } from '@/features/integrations/schema'
import { deleteIntegration, listIntegrations, upsertIntegration } from '@/features/integrations/service'

export const GET = apiHandler(async () => jsonOk(await listIntegrations()))

export const POST = apiHandler(async (request: NextRequest) => {
  const input = await parseBody(request, upsertIntegrationSchema)
  return jsonOk(await upsertIntegration(input), { status: 201 })
})

export const DELETE = apiHandler(async (request: NextRequest) => {
  const id = z.string().min(1).parse(new URL(request.url).searchParams.get('id'))
  await deleteIntegration(id)
  return jsonOk({ deleted: true })
})
