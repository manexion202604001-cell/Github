import 'server-only'
import { db } from '@/server/db'
import { requireProjectAccess } from '@/server/authz'
import { enqueueJob } from '@/jobs/queue'

export async function startScoring(projectId: string) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  return enqueueJob({
    organizationId: context.organizationId,
    projectId,
    kind: 'AI',
    handler: 'scoring.evaluate',
    payload: { projectId },
    createdBy: context.user.id,
  })
}

export async function getLatestScore(projectId: string) {
  await requireProjectAccess(projectId)
  return db.productScore.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } })
}

export async function listScores(projectId: string) {
  await requireProjectAccess(projectId)
  return db.productScore.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' }, take: 20 })
}

/** スコア項目の定義。UIとAIプロンプトで配点を共有する。 */
export const SCORE_ITEMS = [
  { key: 'marketDemand', label: '市場需要', max: 15 },
  { key: 'competition', label: '競合強度', max: 15 },
  { key: 'differentiation', label: '差別化余地', max: 15 },
  { key: 'profitability', label: '利益性', max: 15 },
  { key: 'logistics', label: '物流適性', max: 10 },
  { key: 'advertising', label: '広告適性', max: 10 },
  { key: 'reviewOpportunity', label: 'レビュー改善余地', max: 10 },
  { key: 'expandability', label: 'シリーズ展開性', max: 5 },
  { key: 'risk', label: '規制リスク', max: 5 },
] as const

export const DECISION_LABEL: Record<string, { label: string; description: string; tone: 'go' | 'warn' | 'stop' }> = {
  GO: { label: 'GO', description: '開発推奨', tone: 'go' },
  IMPROVE_GO: { label: 'IMPROVE GO', description: '改善すれば開発可能', tone: 'warn' },
  NO_GO: { label: 'NO GO', description: '開発非推奨', tone: 'stop' },
}
