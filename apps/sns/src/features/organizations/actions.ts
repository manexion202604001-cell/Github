'use server'

import { revalidatePath } from 'next/cache'
import type { MemberRole } from '@/generated/prisma'
import { actionFailure, type ActionResult } from '@/lib/errors'
import { emailSchema } from '@/lib/validation/auth'
import { toOptionalString } from '@/lib/validation/common'
import { changeMemberRole, inviteMember, removeMember, updateOrganization, updateProfile } from './service'

const ROLES: MemberRole[] = ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER']

function parseRole(value: FormDataEntryValue | null): MemberRole {
  const role = String(value ?? '')
  return (ROLES.find((item) => item === role) ?? 'VIEWER') as MemberRole
}

export async function updateProfileAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await updateProfile({
      name: String(form.get('name') ?? '').trim().slice(0, 80),
      jobTitle: toOptionalString(form.get('jobTitle')) ?? null,
    })
    revalidatePath('/settings/profile')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function updateOrganizationAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await updateOrganization({
      name: String(form.get('name') ?? '').trim().slice(0, 80),
      aiProvider: toOptionalString(form.get('aiProvider')) ?? null,
    })
    revalidatePath('/settings/organization')
    revalidatePath('/settings/ai')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function inviteMemberAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await inviteMember({ email: emailSchema.parse(form.get('email')), role: parseRole(form.get('role')) })
    revalidatePath('/settings/team')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function changeMemberRoleAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await changeMemberRole({ memberId: String(form.get('memberId') ?? ''), role: parseRole(form.get('role')) })
    revalidatePath('/settings/team')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function removeMemberAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await removeMember(String(form.get('memberId') ?? ''))
    revalidatePath('/settings/team')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}
