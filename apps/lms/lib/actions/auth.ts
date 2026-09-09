'use server'
import { redirect } from 'next/navigation'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { invitations, profiles } from '@/lib/db/schema'
import { ERR, fail, ok, type ActionResult } from '@/lib/action-result'
import { checkRateLimit } from '@/lib/rate-limit'
import { appUrl } from '@/lib/utils'

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return fail('メールアドレスとパスワードを入力してください。')
  if (!checkRateLimit(`login:${parsed.data.email}`, 10)) return fail(ERR.rateLimited)
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) return fail('メールアドレスまたはパスワードが正しくありません。')
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, data.user.id) })
  if (!profile || profile.deletedAt) {
    await supabase.auth.signOut()
    return fail('このアカウントは利用できません。')
  }
  await db.update(profiles).set({ lastLoginAt: new Date() }).where(eq(profiles.id, data.user.id))
  const next = String(formData.get('next') ?? '')
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

const acceptSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'パスワードは 8 文字以上にしてください。').max(72),
  displayName: z.string().trim().min(1, '表示名を入力してください。').max(40),
})

/** AUTH-01: 招待トークンからの登録（有効期限 7 日、1 回限り） */
export async function acceptInvitation(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
  })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const { token, password, displayName } = parsed.data
  if (!checkRateLimit(`signup:${token}`, 5)) return fail(ERR.rateLimited)

  const invitation = await db.query.invitations.findFirst({
    where: and(eq(invitations.token, token), isNull(invitations.usedAt), gt(invitations.expiresAt, new Date())),
  })
  if (!invitation) return fail('この招待リンクは無効か、有効期限が切れています。')

  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
    app_metadata: { role: invitation.role },
  })
  if (error || !created.user) {
    if (error?.message?.toLowerCase().includes('already')) return fail('このメールアドレスは既に登録されています。ログインしてください。')
    return fail('登録に失敗しました。時間をおいて再度お試しください。')
  }
  // profiles はトリガーで作成される。念のため upsert
  await db
    .insert(profiles)
    .values({ id: created.user.id, displayName, role: invitation.role })
    .onConflictDoUpdate({ target: profiles.id, set: { displayName, role: invitation.role } })
  await db.update(invitations).set({ usedAt: new Date() }).where(eq(invitations.id, invitation.id))

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invitation.email, password })
  if (signInError) redirect('/login?registered=1')
  redirect('/dashboard')
}

/** AUTH-03: パスワードリセットメール */
export async function requestPasswordReset(_prev: ActionResult<{ sent: true }> | null, formData: FormData): Promise<ActionResult<{ sent: true }>> {
  const email = z.string().email().safeParse(formData.get('email'))
  if (!email.success) return fail('メールアドレスを入力してください。')
  if (!checkRateLimit(`reset:${email.data}`, 3)) return fail(ERR.rateLimited)
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: appUrl('/reset-password?step=update') })
  // 存在有無を漏らさないため常に成功扱い
  return ok({ sent: true })
}

export async function updatePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ password: z.string().min(8, 'パスワードは 8 文字以上にしてください。').max(72), confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: 'パスワードが一致しません。' })
    .safeParse({ password: formData.get('password'), confirm: formData.get('confirm') })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? ERR.invalid)
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return fail('パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。')
  redirect('/dashboard')
}
