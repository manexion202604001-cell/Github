'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { actionFailure, type ActionResult } from '@/lib/errors'
import { generateIdeasSchema, ideaEditSchema } from '@/lib/validation/idea'
import { toOptionalString } from '@/lib/validation/common'
import {
  deleteIdea,
  generateHooks,
  generateIdeas,
  generateSimilarIdeas,
  rescoreIdea,
  selectHook,
  toggleFavorite,
  updateIdea,
  type GenerateIdeasResult,
} from './service'

export async function generateIdeasAction(_prev: ActionResult<GenerateIdeasResult> | null, form: FormData): Promise<ActionResult<GenerateIdeasResult>> {
  try {
    const parsed = generateIdeasSchema.parse({
      brandId: form.get('brandId'),
      researchId: toOptionalString(form.get('researchId')),
      channel: form.get('channel'),
      count: Number(form.get('count') ?? 20),
    })
    const result = await generateIdeas(parsed)
    revalidatePath('/ideas')
    revalidatePath('/dashboard')
    return { ok: true, data: result }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function generateSimilarAction(_prev: ActionResult<GenerateIdeasResult> | null, form: FormData): Promise<ActionResult<GenerateIdeasResult>> {
  try {
    const result = await generateSimilarIdeas(String(form.get('ideaId') ?? ''), 5)
    revalidatePath('/ideas')
    return { ok: true, data: result }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function updateIdeaAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const ideaId = String(form.get('ideaId') ?? '')
    await updateIdea(
      ideaId,
      ideaEditSchema.parse({
        title: form.get('title'),
        category: form.get('category'),
        channel: form.get('channel'),
        hook: form.get('hook'),
        summary: form.get('summary'),
        whyThisIdea: form.get('whyThisIdea'),
        target: toOptionalString(form.get('target')) ?? '',
        cta: toOptionalString(form.get('cta')) ?? '',
        durationSec: form.get('durationSec'),
        difficulty: form.get('difficulty'),
      }),
    )
    revalidatePath(`/ideas/${ideaId}`)
    revalidatePath('/ideas')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function toggleFavoriteAction(ideaId: string): Promise<ActionResult<{ isFavorite: boolean }>> {
  try {
    const isFavorite = await toggleFavorite(ideaId)
    revalidatePath('/ideas')
    return { ok: true, data: { isFavorite } }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function rescoreIdeaAction(ideaId: string): Promise<ActionResult> {
  try {
    await rescoreIdea(ideaId)
    revalidatePath(`/ideas/${ideaId}`)
    revalidatePath('/ideas')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function generateHooksAction(ideaId: string): Promise<ActionResult<{ count: number }>> {
  try {
    const result = await generateHooks(ideaId)
    revalidatePath(`/ideas/${ideaId}`)
    return { ok: true, data: { count: result.count } }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function selectHookAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const ideaId = String(form.get('ideaId') ?? '')
    await selectHook(ideaId, String(form.get('hookId') ?? ''))
    revalidatePath(`/ideas/${ideaId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function deleteIdeaAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const redirectTo = toOptionalString(form.get('redirectTo'))
  try {
    await deleteIdea(String(form.get('ideaId') ?? ''))
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/ideas')
  if (redirectTo) redirect(redirectTo)
  return { ok: true, data: null }
}
