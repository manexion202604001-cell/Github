'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { actionFailure, type ActionResult } from '@/lib/errors'
import { generateScriptSchema, sceneSchema, scriptEditSchema, scriptRefineSchema, videoPromptSchema } from '@/lib/validation/script'
import { toOptionalString, toStringList } from '@/lib/validation/common'
import {
  deleteScene,
  deleteScript,
  duplicateScene,
  generateCaptions,
  generateProductionBrief,
  generateScript,
  generateVideoPrompts,
  refineScript,
  reorderScenes,
  runBrandCheck,
  saveScene,
  updateScript,
  updateScriptStatus,
  updateVideoPrompt,
} from './service'

export async function generateScriptAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let scriptId: string
  try {
    const parsed = generateScriptSchema.parse({
      ideaId: form.get('ideaId'),
      channel: form.get('channel'),
      durationSec: Number(form.get('durationSec') ?? 30),
      style: form.get('style'),
      tone: form.get('tone'),
      hook: toOptionalString(form.get('hook')),
    })
    scriptId = await generateScript(parsed)
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/scripts')
  redirect(`/scripts/${scriptId}`)
}

export async function refineScriptAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const parsed = scriptRefineSchema.parse({
      scriptId: form.get('scriptId'),
      instruction: form.get('instruction'),
      ...(toOptionalString(form.get('targetDurationSec'))
        ? { targetDurationSec: Number(form.get('targetDurationSec')) }
        : {}),
    })
    await refineScript(parsed)
    revalidatePath(`/scripts/${parsed.scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function updateScriptAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const scriptId = String(form.get('scriptId') ?? '')
    await updateScript(
      scriptId,
      scriptEditSchema.parse({
        title: form.get('title'),
        channel: form.get('channel'),
        durationSec: form.get('durationSec'),
        style: form.get('style'),
        tone: form.get('tone'),
        hook: form.get('hook'),
        cta: toOptionalString(form.get('cta')) ?? '',
      }),
    )
    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function updateScriptStatusAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const scriptId = String(form.get('scriptId') ?? '')
    const status = String(form.get('status') ?? 'DRAFT') as 'DRAFT' | 'REVIEW' | 'READY' | 'ARCHIVED'
    await updateScriptStatus(scriptId, status)
    revalidatePath(`/scripts/${scriptId}`)
    revalidatePath('/scripts')
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function saveSceneAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const scriptId = String(form.get('scriptId') ?? '')
    const sceneId = toOptionalString(form.get('sceneId')) ?? null
    await saveScene(
      scriptId,
      sceneId,
      sceneSchema.parse({
        startSecond: form.get('startSecond'),
        endSecond: form.get('endSecond'),
        visual: form.get('visual'),
        voice: form.get('voice') ?? '',
        onscreenText: toOptionalString(form.get('onscreenText')) ?? '',
        camera: toOptionalString(form.get('camera')) ?? '',
        assets: toStringList(form.get('assets')),
        purpose: toOptionalString(form.get('purpose')) ?? '',
      }),
    )
    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function sceneCommandAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const scriptId = String(form.get('scriptId') ?? '')
    const sceneId = String(form.get('sceneId') ?? '')
    const command = String(form.get('command') ?? '')

    if (command === 'duplicate') await duplicateScene(scriptId, sceneId)
    else if (command === 'delete') await deleteScene(scriptId, sceneId)
    else return { ok: false, code: 'VALIDATION_ERROR', message: '不明な操作です', hint: null }

    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function reorderScenesAction(scriptId: string, orderedSceneIds: string[]): Promise<ActionResult> {
  try {
    await reorderScenes(scriptId, orderedSceneIds)
    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function generateBriefAction(scriptId: string): Promise<ActionResult> {
  try {
    await generateProductionBrief(scriptId)
    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function generateVideoPromptsAction(_prev: ActionResult<{ count: number }> | null, form: FormData): Promise<ActionResult<{ count: number }>> {
  try {
    const parsed = videoPromptSchema.parse({
      scriptId: form.get('scriptId'),
      preset: form.get('preset'),
      language: form.get('language'),
    })
    const result = await generateVideoPrompts(parsed)
    revalidatePath(`/scripts/${parsed.scriptId}`)
    return { ok: true, data: result }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function updateVideoPromptAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const scriptId = String(form.get('scriptId') ?? '')
    await updateVideoPrompt(String(form.get('promptId') ?? ''), String(form.get('prompt') ?? ''))
    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function generateCaptionsAction(scriptId: string): Promise<ActionResult> {
  try {
    await generateCaptions(scriptId)
    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: null }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function brandCheckAction(scriptId: string): Promise<ActionResult<{ verdict: string }>> {
  try {
    const result = await runBrandCheck(scriptId)
    revalidatePath(`/scripts/${scriptId}`)
    return { ok: true, data: result }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function deleteScriptAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await deleteScript(String(form.get('scriptId') ?? ''))
  } catch (error) {
    return actionFailure(error)
  }
  revalidatePath('/scripts')
  redirect('/scripts')
}
