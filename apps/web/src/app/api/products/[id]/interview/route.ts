import { apiHandler, jsonOk, parseBody } from '@/server/api'
import { interviewAnswerSchema } from '@/features/products/schema'
import { startInterview } from '@/features/products/service'

type Context = { params: Promise<{ id: string }> }

/** AIヒアリングを開始する(要件13)。Jobを返し、/api/jobs/:id でポーリングする。 */
export const POST = apiHandler<Context>(async (request, context) => {
  const { id } = await context.params
  const input = await parseBody(request, interviewAnswerSchema)
  const job = await startInterview(id, input)
  return jsonOk({ jobId: job.id }, { status: 202 })
})
