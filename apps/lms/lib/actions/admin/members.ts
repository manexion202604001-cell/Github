'use server'
import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, hasRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { invitations, profiles } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { InvitationEmail } from '@/emails/templates'
import { appUrl, formatDateTime } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { findExistingEmails } from '@/lib/db/queries/members'

const uuid = z.string().uuid()
const roleSchema = z.enum(['student', 'instructor', 'admin'])
const INVITE_DAYS = 7

async function admin() {
  const user = await getCurrentUser()
  return user && hasRole(user.profile, 'admin') ? user : null
}

function newToken() {
  return randomBytes(24).toString('base64url')
}

function revalidate() {
  revalidatePath('/admin/members')
  revalidatePath('/admin/progress')
  revalidatePath('/admin')
}

// ---------- AUTH-01 / ADM-04 招待 ----------

export type InvitationSummary = { sent: string[]; skipped: { email: string; reason: string }[] }

/** 招待リンク発行（複数）。既存会員・重複はスキップして報告する */
export async function createInvitations(
  emailsInput: string[],
  role: 'student' | 'instructor' | 'admin' = 'student',
): Promise<ActionResult<InvitationSummary>> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const r = roleSchema.safeParse(role)
  const list = z.array(z.string().trim()).max(500).safeParse(emailsInput)
  if (!r.success || !list.success) return fail(ERR.invalid)

  const skipped: InvitationSummary['skipped'] = []
  const seen = new Set<string>()
  const valid: string[] = []
  for (const raw of list.data) {
    const email = raw.toLowerCase()
    if (!email) continue
    if (!z.string().email().safeParse(email).success) {
      skipped.push({ email: raw, reason: '形式が正しくありません' })
      continue
    }
    if (seen.has(email)) continue
    seen.add(email)
    valid.push(email)
  }
  if (valid.length === 0) return fail('有効なメールアドレスがありません。')

  const existing = await findExistingEmails(valid)
  const pending = await db
    .select({ email: invitations.email })
    .from(invitations)
    .where(sql`lower(${invitations.email}) = any(${valid}::text[]) and ${invitations.usedAt} is null and ${invitations.expiresAt} > now()`)
  const pendingSet = new Set(pending.map((p) => p.email.toLowerCase()))

  const sent: string[] = []
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000)
  for (const email of valid) {
    if (existing.has(email)) {
      skipped.push({ email, reason: '既に登録済みです' })
      continue
    }
    if (pendingSet.has(email)) {
      skipped.push({ email, reason: '有効な招待が既にあります' })
      continue
    }
    const token = newToken()
    await db.insert(invitations).values({ email, token, role: r.data, invitedBy: user.id, expiresAt })
    await sendEmail({
      to: email,
      subject: 'studio N 学習プラットフォームへのご招待',
      react: InvitationEmail({ url: appUrl(`/signup?token=${token}`), invitedBy: user.profile.displayName, expiresAt: formatDateTime(expiresAt) }),
    })
    sent.push(email)
  }
  await logAudit({ actorId: user.id, action: 'invitation.create', targetType: 'invitation', detail: { role: r.data, count: sent.length } })
  revalidate()
  return ok({ sent, skipped })
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(invitationId)
  if (!id.success) return fail(ERR.invalid)
  const inv = await db.query.invitations.findFirst({ where: eq(invitations.id, id.data) })
  if (!inv) return fail(ERR.notFound)
  if (inv.usedAt) return fail('使用済みの招待は取り消せません。')
  await db.delete(invitations).where(eq(invitations.id, inv.id))
  await logAudit({ actorId: user.id, action: 'invitation.revoke', targetType: 'invitation', targetId: inv.id, detail: { email: inv.email } })
  revalidate()
  return ok(undefined)
}

/** 再送（新トークン・期限延長） */
export async function resendInvitation(invitationId: string): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(invitationId)
  if (!id.success) return fail(ERR.invalid)
  const inv = await db.query.invitations.findFirst({ where: eq(invitations.id, id.data) })
  if (!inv) return fail(ERR.notFound)
  if (inv.usedAt) return fail('使用済みの招待は再送できません。')
  const token = newToken()
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000)
  await db.update(invitations).set({ token, expiresAt }).where(eq(invitations.id, inv.id))
  await sendEmail({
    to: inv.email,
    subject: 'studio N 学習プラットフォームへのご招待',
    react: InvitationEmail({ url: appUrl(`/signup?token=${token}`), invitedBy: user.profile.displayName, expiresAt: formatDateTime(expiresAt) }),
  })
  revalidate()
  return ok(undefined)
}

// ---------- AUTH-05 ロール ----------

export async function updateRole(userId: string, role: 'student' | 'instructor' | 'admin'): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(userId)
  const r = roleSchema.safeParse(role)
  if (!id.success || !r.success) return fail(ERR.invalid)
  if (id.data === user.id && r.data !== 'admin') return fail('自分自身のロールを下げることはできません。')
  const target = await db.query.profiles.findFirst({ where: eq(profiles.id, id.data) })
  if (!target || target.deletedAt) return fail(ERR.notFound)
  if (target.role === r.data) return ok(undefined)

  await db.update(profiles).set({ role: r.data }).where(eq(profiles.id, target.id))
  try {
    // JWT（app_metadata）にも反映して middleware の判定と同期させる
    const sb = createAdminClient()
    const { error } = await sb.auth.admin.updateUserById(target.id, { app_metadata: { role: r.data } })
    if (error) console.error('[updateRole] app_metadata sync failed', error)
  } catch (e) {
    console.error('[updateRole] app_metadata sync failed', e)
  }
  await logAudit({ actorId: user.id, action: 'role.update', targetType: 'user', targetId: target.id, detail: { from: target.role, to: r.data } })
  revalidate()
  revalidatePath(`/admin/members/${target.id}`)
  return ok(undefined)
}

// ---------- AUTH-06 退会 ----------

/** 退会承認: 匿名化 + ログイン不可（auth.users は残す。消すと profiles が cascade で消え匿名表示ができない） */
export async function approveDeletion(userId: string): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(userId)
  if (!id.success) return fail(ERR.invalid)
  if (id.data === user.id) return fail('自分自身を退会させることはできません。')
  const target = await db.query.profiles.findFirst({ where: eq(profiles.id, id.data) })
  if (!target || target.deletedAt) return fail(ERR.notFound)

  await db.execute(sql`select public.anonymize_user(${target.id}::uuid)`)
  try {
    const sb = createAdminClient()
    const { error } = await sb.auth.admin.updateUserById(target.id, { ban_duration: '876000h' })
    if (error) console.error('[approveDeletion] ban failed', error)
  } catch (e) {
    console.error('[approveDeletion] ban failed', e)
  }
  await logAudit({ actorId: user.id, action: 'deletion.approve', targetType: 'user', targetId: target.id, detail: { displayName: target.displayName } })
  revalidate()
  revalidatePath(`/admin/members/${target.id}`)
  return ok(undefined)
}

export async function rejectDeletion(userId: string): Promise<ActionResult> {
  const user = await admin()
  if (!user) return fail(ERR.forbidden)
  const id = uuid.safeParse(userId)
  if (!id.success) return fail(ERR.invalid)
  const target = await db.query.profiles.findFirst({ where: eq(profiles.id, id.data) })
  if (!target || target.deletedAt) return fail(ERR.notFound)
  await db.update(profiles).set({ deletionRequestedAt: null }).where(eq(profiles.id, target.id))
  await logAudit({ actorId: user.id, action: 'deletion.reject', targetType: 'user', targetId: target.id })
  revalidate()
  revalidatePath(`/admin/members/${target.id}`)
  return ok(undefined)
}
