import { apiHandler, jsonOk } from '@/server/api'
import { requireOrganization } from '@/server/authz'
import { getUsageSummary, listRecentAIJobs } from '@/features/organizations/service'

export const GET = apiHandler(async () => {
  const context = await requireOrganization()
  const [summary, recent] = await Promise.all([
    getUsageSummary(context.organizationId),
    listRecentAIJobs(context.organizationId),
  ])
  return jsonOk({ summary, recent })
})
