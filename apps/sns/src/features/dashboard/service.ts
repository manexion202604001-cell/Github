import 'server-only'
import { db } from '@/server/db'
import { requireOrganization } from '@/server/authz'
import { ideaCategoryLabel } from '@/lib/config/taxonomy'

export type DashboardData = {
  kpi: {
    ideaCount: number
    ideaDelta: number
    scriptCount: number
    scriptDelta: number
    researchCount: number
    researchDelta: number
    plannedThisMonth: number
  }
  recentResearch: { id: string; title: string; createdAt: Date; status: string; brandName: string; sourceCount: number }[]
  recentIdeas: { id: string; title: string; channel: string; status: string; score: number | null }[]
  categoryBreakdown: { category: string; label: string; count: number }[]
  weeklyActivity: { week: string; ideas: number; scripts: number }[]
  hasBrand: boolean
}

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * ダッシュボードの集計(要件12)。
 * ブランド未選択でも組織全体の数値を返し、画面が空にならないようにする。
 */
export async function loadDashboard(brandId?: string): Promise<DashboardData> {
  const context = await requireOrganization()
  const scope = {
    organizationId: context.organizationId,
    deletedAt: null,
    ...(brandId ? { brandId } : {}),
  }

  const monthStart = startOfMonth()
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)

  const [
    ideaCount,
    ideaDelta,
    scriptCount,
    scriptDelta,
    researchCount,
    researchDelta,
    plannedThisMonth,
    recentResearch,
    recentIdeas,
    categoryGroups,
    brandCount,
  ] = await Promise.all([
    db.idea.count({ where: scope }),
    db.idea.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
    db.script.count({ where: scope }),
    db.script.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
    db.researchRun.count({ where: scope }),
    db.researchRun.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
    db.calendarItem.count({
      where: { ...scope, scheduledAt: { gte: monthStart, lt: nextMonthStart }, status: { not: 'ARCHIVED' } },
    }),
    db.researchRun.findMany({
      where: scope,
      include: { brand: { select: { name: true } }, _count: { select: { sources: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    db.idea.findMany({
      where: scope,
      include: { score: { select: { overall: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.idea.groupBy({ by: ['category'], where: scope, _count: { _all: true } }),
    db.brand.count({ where: { organizationId: context.organizationId, deletedAt: null } }),
  ])

  // 直近8週の作成数。Rechartsへそのまま渡せる形にする。
  const weekStarts: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - cursor.getDay())
  for (let index = 7; index >= 0; index -= 1) {
    const start = new Date(cursor)
    start.setDate(cursor.getDate() - index * 7)
    weekStarts.push(start)
  }

  const since = weekStarts[0] ?? monthStart
  const [ideasForChart, scriptsForChart] = await Promise.all([
    db.idea.findMany({ where: { ...scope, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.script.findMany({ where: { ...scope, createdAt: { gte: since } }, select: { createdAt: true } }),
  ])

  const weeklyActivity = weekStarts.map((start, index) => {
    const end = weekStarts[index + 1] ?? new Date(start.getTime() + 7 * 24 * 3600_000)
    const inRange = (date: Date) => date >= start && date < end
    return {
      week: `${start.getMonth() + 1}/${start.getDate()}`,
      ideas: ideasForChart.filter((item) => inRange(item.createdAt)).length,
      scripts: scriptsForChart.filter((item) => inRange(item.createdAt)).length,
    }
  })

  return {
    kpi: { ideaCount, ideaDelta, scriptCount, scriptDelta, researchCount, researchDelta, plannedThisMonth },
    recentResearch: recentResearch.map((run) => ({
      id: run.id,
      title: run.title,
      createdAt: run.createdAt,
      status: run.status,
      brandName: run.brand.name,
      sourceCount: run._count.sources,
    })),
    recentIdeas: recentIdeas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      channel: idea.channel,
      status: idea.status,
      score: idea.score?.overall ?? null,
    })),
    categoryBreakdown: categoryGroups
      .map((group) => ({
        category: group.category,
        label: ideaCategoryLabel(group.category),
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    weeklyActivity,
    hasBrand: brandCount > 0,
  }
}
