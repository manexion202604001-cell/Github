import type { NextRequest } from 'next/server'
import { apiHandler } from '@/server/api'
import { getScript } from '@/features/scripts/service'
import { toMarkdown } from '@/features/scripts/domain'
import { channelLabel } from '@/lib/config/channels'
import { SCRIPT_STYLES, SCRIPT_TONES, labelOf } from '@/lib/config/taxonomy'

/** 台本の Markdown ダウンロード(要件102)。 */
export const GET = apiHandler<{ params: Promise<{ id: string }> }>(async (_request: NextRequest, context) => {
  const { id } = await context.params
  const script = await getScript(id)

  const markdown = toMarkdown({
    title: script.title,
    brandName: script.brand.name,
    channelLabel: channelLabel(script.channel),
    durationSec: script.durationSec,
    styleLabel: labelOf(SCRIPT_STYLES, script.style),
    toneLabel: labelOf(SCRIPT_TONES, script.tone),
    hook: script.hook,
    cta: script.cta,
    scenes: script.scenes.map((scene) => ({
      position: scene.position,
      startSecond: scene.startSecond,
      endSecond: scene.endSecond,
      visual: scene.visual,
      voice: scene.voice,
      onscreenText: scene.onscreenText,
      camera: scene.camera,
      assets: scene.assets,
      purpose: scene.purpose,
    })),
  })

  return new Response(markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="script-${script.id}.md"`,
    },
  })
})
