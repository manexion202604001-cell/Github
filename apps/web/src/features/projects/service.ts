import 'server-only'
import type { ProjectStage } from '@prisma/client'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/server/audit'
import { requireOrganization, requireProjectAccess } from '@/server/authz'
import type { CreateProjectInput, UpdateProjectInput } from './schema'
import { PROJECT_STAGES } from './schema'

/** ステージの進行順。ダッシュボードの進捗表示に使う。 */
export function stageIndex(stage: ProjectStage): number {
  return PROJECT_STAGES.indexOf(stage)
}

export async function listProjects(organizationId?: string) {
  const context = await requireOrganization(organizationId)
  const projects = await db.project.findMany({
    where: { organizationId: context.organizationId, archivedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      product: { select: { name: true, category: true, price: true, completeness: true } },
      scores: { orderBy: { createdAt: 'desc' }, take: 1, select: { total: true, decision: true } },
      costSimulations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { operatingProfitRate: true, monthlyUnits: true, sellingPrice: true },
      },
      _count: { select: { tasks: { where: { done: false } } } },
    },
  })

  return projects.map((project) => {
    const cost = project.costSimulations[0]
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      stage: project.stage,
      status: project.status,
      updatedAt: project.updatedAt,
      productName: project.product?.name ?? null,
      category: project.product?.category ?? null,
      completeness: project.product?.completeness ?? 0,
      score: project.scores[0]?.total ?? null,
      decision: project.scores[0]?.decision ?? null,
      estimatedMonthlyRevenue: cost ? cost.sellingPrice * cost.monthlyUnits : null,
      estimatedProfitRate: cost?.operatingProfitRate ?? null,
      openTasks: project._count.tasks,
    }
  })
}

export async function getProject(projectId: string) {
  await requireProjectAccess(projectId)
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      product: true,
      tasks: { orderBy: [{ done: 'asc' }, { order: 'asc' }] },
    },
  })
  if (!project) throw AppError.notFound('プロジェクトが見つかりません')
  return project
}

export async function createProject(input: CreateProjectInput, organizationId?: string) {
  const context = await requireOrganization(organizationId)
  if (context.role === 'VIEWER') throw AppError.forbidden('閲覧者はプロジェクトを作成できません')

  const project = await db.project.create({
    data: {
      organizationId: context.organizationId,
      name: input.name,
      description: input.description ?? null,
      createdBy: context.user.id,
      product: {
        create: {
          name: input.name,
          rawInput: input.idea ?? null,
          description: input.idea ?? null,
        },
      },
    },
  })

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'project.create',
    entityType: 'Project',
    entityId: project.id,
    summary: `プロジェクト「${input.name}」を作成`,
  })

  return project
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  const context = await requireProjectAccess(projectId, 'EDITOR')
  const project = await db.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.stage !== undefined ? { stage: input.stage } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  })

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'project.update',
    entityType: 'Project',
    entityId: projectId,
    diff: input,
  })

  return project
}

export async function archiveProject(projectId: string): Promise<void> {
  const context = await requireProjectAccess(projectId, 'ADMIN')
  await db.project.update({
    where: { id: projectId },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
  })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'project.archive',
    entityType: 'Project',
    entityId: projectId,
  })
}

/**
 * ステージは後戻りさせない。すでに先へ進んでいる場合は据え置く。
 * 各featureが処理完了時に呼ぶ。
 */
export async function advanceStage(projectId: string, stage: ProjectStage): Promise<void> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { stage: true } })
  if (!project) return
  if (stageIndex(project.stage) >= stageIndex(stage)) return
  await db.project.update({ where: { id: projectId }, data: { stage } })
}

export async function getDashboard(organizationId?: string) {
  const context = await requireOrganization(organizationId)
  const projects = await listProjects(context.organizationId)

  const active = projects.filter((project) => project.status === 'ACTIVE')
  const withScore = projects.filter((project) => project.score !== null)
  const withRevenue = projects.filter((project) => project.estimatedMonthlyRevenue !== null)
  const withProfit = projects.filter((project) => project.estimatedProfitRate !== null)

  const recentJobs = await db.job.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, kind: true, handler: true, status: true, createdAt: true, projectId: true, progress: true },
  })

  // AIからの提案: 全プロジェクトの未対応改善提案から優先度順に(要件8)
  const suggestions = await db.improvement.findMany({
    where: { status: 'PROPOSED', project: { organizationId: context.organizationId, archivedAt: null } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: 5,
    include: { project: { select: { id: true, name: true } } },
  })

  const openTasks = await db.projectTask.findMany({
    where: { done: false, project: { organizationId: context.organizationId, archivedAt: null } },
    orderBy: [{ createdAt: 'desc' }],
    take: 10,
    include: { project: { select: { id: true, name: true } } },
  })

  return {
    organizationId: context.organizationId,
    role: context.role,
    projects,
    stats: {
      total: projects.length,
      active: active.length,
      averageScore:
        withScore.length > 0
          ? Math.round(withScore.reduce((sum, project) => sum + (project.score ?? 0), 0) / withScore.length)
          : null,
      estimatedMonthlyRevenue: withRevenue.reduce(
        (sum, project) => sum + (project.estimatedMonthlyRevenue ?? 0),
        0,
      ),
      averageProfitRate:
        withProfit.length > 0
          ? withProfit.reduce((sum, project) => sum + (project.estimatedProfitRate ?? 0), 0) / withProfit.length
          : null,
      openTasks: projects.reduce((sum, project) => sum + project.openTasks, 0),
    },
    recentJobs,
    suggestions: suggestions.map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      target: suggestion.target,
      priority: suggestion.priority,
      projectId: suggestion.project.id,
      projectName: suggestion.project.name,
    })),
    openTasks: openTasks.map((task) => ({
      id: task.id,
      title: task.title,
      stage: task.stage,
      projectId: task.project.id,
      projectName: task.project.name,
    })),
  }
}

export async function toggleTask(taskId: string, done: boolean): Promise<void> {
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { projectId: true } })
  if (!task) throw AppError.notFound('タスクが見つかりません')
  await requireProjectAccess(task.projectId, 'EDITOR')
  await db.projectTask.update({ where: { id: taskId }, data: { done } })
}

export async function replaceTasks(
  projectId: string,
  stage: ProjectStage,
  items: { title: string; detail: string | null }[],
): Promise<void> {
  await db.$transaction([
    db.projectTask.deleteMany({ where: { projectId, stage, done: false } }),
    db.projectTask.createMany({
      data: items.map((item, index) => ({
        projectId,
        stage,
        title: item.title,
        detail: item.detail,
        order: index,
      })),
    }),
  ])
}
