import 'server-only'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireBrandAccess, requireOrganization } from '@/server/authz'
import type { CalendarItemInput } from '@/lib/validation/calendar'

export async function listCalendarItems(options: { brandId?: string; from?: Date; to?: Date } = {}) {
  const context = await requireOrganization()
  return db.calendarItem.findMany({
    where: {
      organizationId: context.organizationId,
      deletedAt: null,
      ...(options.brandId ? { brandId: options.brandId } : {}),
      ...(options.from || options.to
        ? {
            scheduledAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    },
    include: {
      brand: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      idea: { select: { id: true, title: true } },
      script: { select: { id: true, title: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })
}

export async function createCalendarItem(input: CalendarItemInput): Promise<string> {
  const context = await requireBrandAccess(input.brandId, 'EDITOR')

  // 他組織のIdea/Scriptを紐づけられないよう、所属を必ず検証する。
  if (input.ideaId) {
    const idea = await db.idea.findFirst({
      where: { id: input.ideaId, organizationId: context.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!idea) throw AppError.notFound('企画が見つかりません')
  }
  if (input.scriptId) {
    const script = await db.script.findFirst({
      where: { id: input.scriptId, organizationId: context.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!script) throw AppError.notFound('台本が見つかりません')
  }
  if (input.assigneeId) {
    const member = await db.organizationMember.findFirst({
      where: { organizationId: context.organizationId, userId: input.assigneeId },
      select: { id: true },
    })
    if (!member) throw AppError.notFound('担当者が組織のメンバーではありません')
  }

  const item = await db.calendarItem.create({
    data: {
      organizationId: context.organizationId,
      brandId: input.brandId,
      ideaId: input.ideaId ?? null,
      scriptId: input.scriptId ?? null,
      title: input.title,
      channel: input.channel,
      scheduledAt: input.scheduledAt,
      status: input.status as 'IDEA' | 'SCRIPT' | 'READY' | 'PLANNED' | 'POSTED' | 'ARCHIVED',
      assigneeId: input.assigneeId ?? null,
      notes: input.notes || null,
    },
  })
  return item.id
}

export async function updateCalendarItem(itemId: string, input: Partial<CalendarItemInput>): Promise<void> {
  const context = await requireOrganization()
  const item = await db.calendarItem.findFirst({
    where: { id: itemId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true },
  })
  if (!item) throw AppError.notFound('投稿予定が見つかりません')
  await requireBrandAccess(item.brandId, 'EDITOR')

  await db.calendarItem.update({
    where: { id: itemId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      ...(input.status ? { status: input.status as 'IDEA' | 'SCRIPT' | 'READY' | 'PLANNED' | 'POSTED' | 'ARCHIVED' } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId ?? null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    },
  })
}

export async function deleteCalendarItem(itemId: string): Promise<void> {
  const context = await requireOrganization()
  const item = await db.calendarItem.findFirst({
    where: { id: itemId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true },
  })
  if (!item) throw AppError.notFound('投稿予定が見つかりません')
  await requireBrandAccess(item.brandId, 'EDITOR')
  await db.calendarItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } })
}
