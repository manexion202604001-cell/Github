'use server'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { withRls } from '@/lib/db/rls'
import { notifications } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'

/** 通知を既読にする（本人のみ） */
export async function markRead(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  const idp = z.string().uuid().safeParse(id)
  if (!idp.success) return fail(ERR.invalid)
  await withRls(user.id, (tx) =>
    tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, idp.data), eq(notifications.userId, user.id), isNull(notifications.readAt))),
  )
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
  return ok(undefined)
}

/** すべて既読にする */
export async function markAllRead(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail(ERR.unauthorized)
  await withRls(user.id, (tx) =>
    tx.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
  )
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
  return ok(undefined)
}
