import 'server-only'
import type { Prisma } from '@/generated/prisma'
import { db } from '@/server/db'
import { AppError } from '@/lib/errors'
import { requireBrandAccess, requireOrganization } from '@/server/authz'
import { recordAudit } from '@/server/audit'
import { organizationProviderId } from '@/server/org-provider'
import { runAITask } from '@/lib/ai/task'
import { scriptGenerationTask, scriptRefineTask } from '@/lib/ai/prompts/scripts'
import { productionBriefTask } from '@/lib/ai/prompts/production'
import { videoPromptTask } from '@/lib/ai/prompts/video-prompt'
import { captionTask } from '@/lib/ai/prompts/captions'
import { brandCheckTask } from '@/lib/ai/prompts/brand-check'
import { loadBrandContext } from '@/features/brands/service'
import type { GenerateScriptInput, SceneInput, ScriptEditInput, ScriptRefineInput, VideoPromptInput } from '@/lib/validation/script'
import { normalizeTimeline } from './domain'

export type ScriptFilter = { brandId?: string; channel?: string; status?: string; keyword?: string }

export async function listScripts(filter: ScriptFilter = {}, limit = 60) {
  const context = await requireOrganization()
  return db.script.findMany({
    where: {
      organizationId: context.organizationId,
      deletedAt: null,
      ...(filter.brandId ? { brandId: filter.brandId } : {}),
      ...(filter.channel ? { channel: filter.channel } : {}),
      ...(filter.status ? { status: filter.status as 'DRAFT' | 'REVIEW' | 'READY' | 'ARCHIVED' } : {}),
      ...(filter.keyword
        ? {
            OR: [
              { title: { contains: filter.keyword, mode: 'insensitive' as const } },
              { hook: { contains: filter.keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    include: {
      brand: { select: { id: true, name: true } },
      idea: { select: { id: true, title: true, score: { select: { overall: true } } } },
      _count: { select: { scenes: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })
}

export async function getScript(scriptId: string) {
  const context = await requireOrganization()
  const script = await db.script.findFirst({
    where: { id: scriptId, organizationId: context.organizationId, deletedAt: null },
    include: {
      brand: { select: { id: true, name: true } },
      idea: { select: { id: true, title: true, target: true, score: { select: { overall: true } } } },
      scenes: { orderBy: { position: 'asc' }, include: { prompts: true } },
      brief: true,
      captions: true,
      brandChecks: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!script) throw AppError.notFound('台本が見つかりません')
  return script
}

/** 企画から台本を生成する(要件29, 30)。 */
export async function generateScript(input: GenerateScriptInput): Promise<string> {
  const context = await requireOrganization()
  const idea = await db.idea.findFirst({
    where: { id: input.ideaId, organizationId: context.organizationId, deletedAt: null },
    include: { hooks: { where: { isSelected: true }, take: 1 }, research: { select: { id: true } } },
  })
  if (!idea) throw AppError.notFound('企画が見つかりません')
  await requireBrandAccess(idea.brandId, 'EDITOR')

  const providerId = await organizationProviderId(context.organizationId)
  const brand = await loadBrandContext(idea.brandId)

  const insights = idea.insightIds.length > 0
    ? await db.researchInsight.findMany({ where: { id: { in: idea.insightIds } }, take: 6 })
    : []

  const selectedHook = input.hook ?? idea.hooks[0]?.text ?? idea.hook

  const generated = await runAITask(
    scriptGenerationTask,
    {
      brand,
      channel: input.channel,
      durationSec: input.durationSec,
      style: input.style,
      tone: input.tone,
      hook: selectedHook,
      idea: {
        title: idea.title,
        category: idea.category,
        summary: idea.summary,
        whyThisIdea: idea.whyThisIdea,
        target: idea.target,
        cta: idea.cta,
      },
      insights: insights.map((insight) => ({ title: insight.title, content: insight.content })),
    },
    { organizationId: context.organizationId, userId: context.user.id, ...(providerId ? { providerId } : {}) },
  )

  const scenes = normalizeTimeline(generated.data.scenes, input.durationSec)

  const script = await db.script.create({
    data: {
      organizationId: context.organizationId,
      brandId: idea.brandId,
      ideaId: idea.id,
      title: generated.data.title || idea.title,
      channel: input.channel,
      durationSec: input.durationSec,
      style: input.style,
      tone: input.tone,
      hook: generated.data.hook || selectedHook,
      cta: generated.data.cta || idea.cta,
      createdById: context.user.id,
      scenes: {
        create: scenes.map((scene, index) => ({
          position: index,
          startSecond: scene.startSecond,
          endSecond: scene.endSecond,
          visual: scene.visual,
          voice: scene.voice,
          onscreenText: scene.onscreenText || null,
          camera: scene.camera || null,
          assets: scene.assets,
          purpose: scene.purpose || null,
        })),
      },
    },
  })

  await db.idea.update({ where: { id: idea.id }, data: { status: 'SCRIPTED' } })
  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'script.generate',
    entityType: 'script',
    entityId: script.id,
    summary: `${script.title} を生成`,
  })

  return script.id
}

/** 台本全体へAI修正を適用する(要件33)。 */
export async function refineScript(input: ScriptRefineInput): Promise<void> {
  const context = await requireOrganization()
  const script = await db.script.findFirst({
    where: { id: input.scriptId, organizationId: context.organizationId, deletedAt: null },
    include: { scenes: { orderBy: { position: 'asc' } } },
  })
  if (!script) throw AppError.notFound('台本が見つかりません')
  await requireBrandAccess(script.brandId, 'EDITOR')

  const providerId = await organizationProviderId(context.organizationId)
  const brand = await loadBrandContext(script.brandId)
  const targetDuration = input.targetDurationSec ?? script.durationSec

  const refined = await runAITask(
    scriptRefineTask,
    {
      brand,
      channel: script.channel,
      instruction: input.instruction,
      targetDurationSec: targetDuration,
      current: {
        title: script.title,
        hook: script.hook,
        cta: script.cta,
        scenes: script.scenes.map((scene) => ({
          startSecond: scene.startSecond,
          endSecond: scene.endSecond,
          visual: scene.visual,
          voice: scene.voice,
          onscreenText: scene.onscreenText,
          camera: scene.camera,
          purpose: scene.purpose,
        })),
      },
    },
    { organizationId: context.organizationId, userId: context.user.id, ...(providerId ? { providerId } : {}) },
  )

  const scenes = normalizeTimeline(refined.data.scenes, targetDuration)

  await db.$transaction([
    db.scriptScene.deleteMany({ where: { scriptId: script.id } }),
    db.script.update({
      where: { id: script.id },
      data: {
        title: refined.data.title || script.title,
        hook: refined.data.hook || script.hook,
        cta: refined.data.cta || script.cta,
        durationSec: targetDuration,
        scenes: {
          create: scenes.map((scene, index) => ({
            position: index,
            startSecond: scene.startSecond,
            endSecond: scene.endSecond,
            visual: scene.visual,
            voice: scene.voice,
            onscreenText: scene.onscreenText || null,
            camera: scene.camera || null,
            assets: scene.assets,
            purpose: scene.purpose || null,
          })),
        },
      },
    }),
  ])

  await recordAudit({
    organizationId: context.organizationId,
    userId: context.user.id,
    action: 'script.refine',
    entityType: 'script',
    entityId: script.id,
    summary: `AI修正: ${input.instruction}`,
  })
}

export async function updateScript(scriptId: string, input: ScriptEditInput): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  await db.script.update({
    where: { id: script.id },
    data: {
      title: input.title,
      channel: input.channel,
      durationSec: input.durationSec,
      style: input.style,
      tone: input.tone,
      hook: input.hook,
      cta: input.cta || null,
    },
  })
}

export async function updateScriptStatus(scriptId: string, status: 'DRAFT' | 'REVIEW' | 'READY' | 'ARCHIVED'): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  await db.script.update({ where: { id: script.id }, data: { status } })
}

export async function saveScene(scriptId: string, sceneId: string | null, input: SceneInput): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  const data = {
    startSecond: input.startSecond,
    endSecond: Math.max(input.endSecond, input.startSecond + 1),
    visual: input.visual,
    voice: input.voice,
    onscreenText: input.onscreenText || null,
    camera: input.camera || null,
    assets: input.assets,
    purpose: input.purpose || null,
  }

  if (sceneId) {
    const existing = await db.scriptScene.findFirst({ where: { id: sceneId, scriptId: script.id } })
    if (!existing) throw AppError.notFound('シーンが見つかりません')
    await db.scriptScene.update({ where: { id: sceneId }, data })
  } else {
    const count = await db.scriptScene.count({ where: { scriptId: script.id } })
    await db.scriptScene.create({ data: { ...data, scriptId: script.id, position: count } })
  }
}

export async function duplicateScene(scriptId: string, sceneId: string): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  const scene = await db.scriptScene.findFirst({ where: { id: sceneId, scriptId: script.id } })
  if (!scene) throw AppError.notFound('シーンが見つかりません')

  await db.$transaction(async (tx) => {
    // 複製したシーンを直後へ差し込むため、後続の position をひとつ後ろへずらす。
    await tx.scriptScene.updateMany({
      where: { scriptId: script.id, position: { gt: scene.position } },
      data: { position: { increment: 1 } },
    })
    await tx.scriptScene.create({
      data: {
        scriptId: script.id,
        position: scene.position + 1,
        startSecond: scene.startSecond,
        endSecond: scene.endSecond,
        visual: scene.visual,
        voice: scene.voice,
        onscreenText: scene.onscreenText,
        camera: scene.camera,
        assets: scene.assets,
        purpose: scene.purpose,
      },
    })
  })
}

export async function deleteScene(scriptId: string, sceneId: string): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  const scene = await db.scriptScene.findFirst({ where: { id: sceneId, scriptId: script.id } })
  if (!scene) throw AppError.notFound('シーンが見つかりません')

  await db.$transaction([
    db.scriptScene.delete({ where: { id: sceneId } }),
    db.scriptScene.updateMany({
      where: { scriptId: script.id, position: { gt: scene.position } },
      data: { position: { decrement: 1 } },
    }),
  ])
}

export async function reorderScenes(scriptId: string, orderedSceneIds: string[]): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  const scenes = await db.scriptScene.findMany({ where: { scriptId: script.id }, select: { id: true } })
  const known = new Set(scenes.map((scene) => scene.id))
  // 与えられた並びが現在のシーン集合と一致しない場合は、部分更新で壊さず拒否する。
  if (orderedSceneIds.length !== scenes.length || orderedSceneIds.some((id) => !known.has(id))) {
    throw AppError.validation('並び替えの対象が一致しません')
  }

  await db.$transaction(
    orderedSceneIds.map((id, index) => db.scriptScene.update({ where: { id }, data: { position: index } })),
  )
}

export async function deleteScript(scriptId: string): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  await db.script.update({ where: { id: script.id }, data: { deletedAt: new Date() } })
  await recordAudit({
    organizationId: script.organizationId,
    userId: script.userId,
    action: 'script.delete',
    entityType: 'script',
    entityId: script.id,
    summary: `${script.title} を削除(復元可能)`,
  })
}

/** 撮影指示書(要件34)。 */
export async function generateProductionBrief(scriptId: string): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  const full = await db.script.findUniqueOrThrow({
    where: { id: script.id },
    include: { scenes: { orderBy: { position: 'asc' } } },
  })

  const providerId = await organizationProviderId(script.organizationId)
  const brand = await loadBrandContext(full.brandId)

  const result = await runAITask(
    productionBriefTask,
    {
      brand,
      style: full.style,
      script: {
        title: full.title,
        durationSec: full.durationSec,
        scenes: full.scenes.map((scene) => ({
          position: scene.position + 1,
          visual: scene.visual,
          voice: scene.voice,
          onscreenText: scene.onscreenText,
          camera: scene.camera,
          assets: scene.assets,
        })),
      },
    },
    { organizationId: script.organizationId, userId: script.userId, ...(providerId ? { providerId } : {}) },
  )

  const data = {
    cast: result.data.cast,
    locations: result.data.locations,
    equipment: result.data.equipment,
    assets: result.data.assets,
    shotList: result.data.shotList as unknown as Prisma.InputJsonValue,
    shootOrder: result.data.shootOrder,
    cautions: result.data.cautions,
    captions: result.data.captions,
    brollIdeas: result.data.brollIdeas,
  }

  await db.productionBrief.upsert({
    where: { scriptId: script.id },
    create: { ...data, scriptId: script.id },
    update: data,
  })
}

/** 動画生成AI用プロンプト(要件35〜39)。動画そのものは生成しない。 */
export async function generateVideoPrompts(input: VideoPromptInput): Promise<{ count: number }> {
  const script = await requireScriptEdit(input.scriptId)
  const full = await db.script.findUniqueOrThrow({
    where: { id: script.id },
    include: { scenes: { orderBy: { position: 'asc' } } },
  })

  const providerId = await organizationProviderId(script.organizationId)
  const brand = await loadBrandContext(full.brandId)

  const result = await runAITask(
    videoPromptTask,
    {
      brand,
      channel: full.channel,
      preset: input.preset,
      language: input.language,
      script: {
        title: full.title,
        tone: full.tone,
        scenes: full.scenes.map((scene) => ({
          position: scene.position + 1,
          startSecond: scene.startSecond,
          endSecond: scene.endSecond,
          visual: scene.visual,
          voice: scene.voice,
          camera: scene.camera,
          assets: scene.assets,
        })),
      },
    },
    { organizationId: script.organizationId, userId: script.userId, ...(providerId ? { providerId } : {}) },
  )

  let saved = 0
  for (const prompt of result.data.prompts) {
    const scene = full.scenes[prompt.sceneNumber - 1]
    if (!scene) continue
    const data = {
      prompt: prompt.prompt,
      negativePrompt: prompt.negativePrompt || null,
      structureJson: prompt as unknown as Prisma.InputJsonValue,
    }
    await db.videoPrompt.upsert({
      where: {
        scriptSceneId_preset_language: { scriptSceneId: scene.id, preset: input.preset, language: input.language },
      },
      create: { ...data, scriptSceneId: scene.id, preset: input.preset, language: input.language },
      update: data,
    })
    saved += 1
  }

  return { count: saved }
}

export async function updateVideoPrompt(promptId: string, text: string): Promise<void> {
  const context = await requireOrganization()
  const prompt = await db.videoPrompt.findFirst({
    where: { id: promptId, scene: { script: { organizationId: context.organizationId, deletedAt: null } } },
    select: { id: true, scene: { select: { script: { select: { brandId: true } } } } },
  })
  if (!prompt) throw AppError.notFound('プロンプトが見つかりません')
  await requireBrandAccess(prompt.scene.script.brandId, 'EDITOR')
  await db.videoPrompt.update({ where: { id: promptId }, data: { prompt: text } })
}

/** 投稿文章(要件40)。 */
export async function generateCaptions(scriptId: string): Promise<void> {
  const script = await requireScriptEdit(scriptId)
  const full = await db.script.findUniqueOrThrow({
    where: { id: script.id },
    include: { scenes: { orderBy: { position: 'asc' } } },
  })

  const providerId = await organizationProviderId(script.organizationId)
  const brand = await loadBrandContext(full.brandId)

  const result = await runAITask(
    captionTask,
    {
      brand,
      channel: full.channel,
      script: {
        title: full.title,
        hook: full.hook,
        cta: full.cta,
        scenes: full.scenes.map((scene) => ({ voice: scene.voice })),
      },
    },
    { organizationId: script.organizationId, userId: script.userId, ...(providerId ? { providerId } : {}) },
  )

  const data = {
    instagramCaption: result.data.instagramCaption || null,
    tiktokCaption: result.data.tiktokCaption || null,
    youtubeTitle: result.data.youtubeTitle || null,
    description: result.data.description || null,
    cta: result.data.cta || null,
    hashtags: result.data.hashtags,
  }

  await db.scriptCaption.upsert({
    where: { scriptId: script.id },
    create: { ...data, scriptId: script.id },
    update: data,
  })
}

/** Brand Guard による表現チェック(要件46)。 */
export async function runBrandCheck(scriptId: string): Promise<{ verdict: 'SAFE' | 'WARNING' | 'REVIEW' }> {
  const script = await requireScriptEdit(scriptId)
  const full = await db.script.findUniqueOrThrow({
    where: { id: script.id },
    include: { scenes: { orderBy: { position: 'asc' } } },
  })

  const providerId = await organizationProviderId(script.organizationId)
  const brand = await loadBrandContext(full.brandId)

  const result = await runAITask(
    brandCheckTask,
    {
      brand,
      script: {
        title: full.title,
        hook: full.hook,
        cta: full.cta,
        scenes: full.scenes.map((scene) => ({ voice: scene.voice, onscreenText: scene.onscreenText })),
      },
    },
    { organizationId: script.organizationId, userId: script.userId, ...(providerId ? { providerId } : {}) },
  )

  await db.brandCheck.create({
    data: {
      scriptId: script.id,
      verdict: result.data.verdict,
      findings: { summary: result.data.summary, items: result.data.findings } as unknown as Prisma.InputJsonValue,
    },
  })

  return { verdict: result.data.verdict }
}

/** 台本の編集権限を確認し、以降の処理で使う識別子を返す。 */
async function requireScriptEdit(scriptId: string) {
  const context = await requireOrganization()
  const script = await db.script.findFirst({
    where: { id: scriptId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true, brandId: true, title: true, organizationId: true },
  })
  if (!script) throw AppError.notFound('台本が見つかりません')
  await requireBrandAccess(script.brandId, 'EDITOR')
  return { ...script, userId: context.user.id }
}
