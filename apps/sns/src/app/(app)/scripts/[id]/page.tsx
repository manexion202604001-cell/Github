import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, Lightbulb } from 'lucide-react'
import { getScript } from '@/features/scripts/service'
import { AppError } from '@/lib/errors'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreGauge } from '@/components/ui/score-gauge'
import { PrintButton } from '@/components/ui/print-button'
import { CopyButton } from '@/components/ui/copy-button'
import { SceneBoard } from '@/components/scripts/scene-board'
import { ScriptQuickActions } from '@/components/scripts/quick-actions'
import { VideoPromptPanel, type PromptData } from '@/components/scripts/video-prompt-panel'
import { ProductionBriefPanel } from '@/components/scripts/production-brief-panel'
import { CaptionPanel } from '@/components/scripts/caption-panel'
import { BrandCheckPanel } from '@/components/scripts/brand-check-panel'
import { ScriptHeaderActions } from '@/components/scripts/header-actions'
import { CalendarAddButton } from '@/components/calendar/add-button'
import { toMarkdown } from '@/features/scripts/domain'
import { channelLabel } from '@/lib/config/channels'
import { SCRIPT_STYLES, SCRIPT_TONES, labelOf } from '@/lib/config/taxonomy'
import { formatSeconds } from '@/lib/format'

export const metadata: Metadata = { title: '台本' }
export const dynamic = 'force-dynamic'

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const script = await getScript(id).catch((error) => {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  })

  const scenes = script.scenes.map((scene) => ({
    id: scene.id,
    position: scene.position,
    startSecond: scene.startSecond,
    endSecond: scene.endSecond,
    visual: scene.visual,
    voice: scene.voice,
    onscreenText: scene.onscreenText,
    camera: scene.camera,
    assets: scene.assets,
    purpose: scene.purpose,
  }))

  const markdown = toMarkdown({
    title: script.title,
    brandName: script.brand.name,
    channelLabel: channelLabel(script.channel),
    durationSec: script.durationSec,
    styleLabel: labelOf(SCRIPT_STYLES, script.style),
    toneLabel: labelOf(SCRIPT_TONES, script.tone),
    hook: script.hook,
    cta: script.cta,
    scenes,
  })

  const prompts: PromptData[] = script.scenes.flatMap((scene) =>
    scene.prompts.map((prompt) => {
      const structure = (prompt.structureJson ?? {}) as { explanationJa?: string }
      return {
        id: prompt.id,
        sceneNumber: scene.position + 1,
        preset: prompt.preset,
        language: prompt.language,
        prompt: prompt.prompt,
        negativePrompt: prompt.negativePrompt,
        explanationJa: structure.explanationJa ?? null,
      }
    }),
  )

  const latestCheck = script.brandChecks[0]

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Scripts', href: '/scripts' }, { label: script.title }]}
        title={script.title}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/scripts/${script.id}/export`}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-canvas-alt"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Markdown
            </a>
            <CopyButton value={markdown} label="台本をコピー" size="md" className="h-10" />
            <PrintButton />
            <ScriptHeaderActions scriptId={script.id} status={script.status} title={script.title} />
          </div>
        }
      />

      {/* 台本上部の要約(要件31)。 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{channelLabel(script.channel)}</Badge>
              <Badge tone="neutral">{formatSeconds(script.durationSec)}</Badge>
              <Badge tone="neutral">{labelOf(SCRIPT_STYLES, script.style)}</Badge>
              <Badge tone="neutral">{labelOf(SCRIPT_TONES, script.tone)}</Badge>
              <Badge tone={script.status === 'READY' ? 'positive' : 'neutral'}>{script.status}</Badge>
              {script.idea ? (
                <Link
                  href={`/ideas/${script.idea.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <Lightbulb className="h-3 w-3" aria-hidden="true" />
                  {script.idea.title}
                </Link>
              ) : null}
            </div>

            <div>
              <p className="text-[11px] font-bold tracking-wide text-ink-subtle">選択中のHOOK</p>
              <p className="mt-1.5 rounded-[12px] bg-canvas-alt px-4 py-3 text-[16px] font-bold leading-snug text-navy">
                「{script.hook}」
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-ink-subtle">ターゲット</p>
                <p className="mt-0.5 text-[13px] text-navy">{script.idea?.target ?? '未設定'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-ink-subtle">CTA</p>
                <p className="mt-0.5 text-[13px] text-navy">{script.cta ?? '未設定'}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card tone="raised">
          <CardBody className="flex flex-col items-center justify-center gap-3 text-center">
            {script.idea?.score ? (
              <>
                <ScoreGauge value={script.idea.score.overall} size="md" />
                <p className="text-[11px] text-ink-subtle">元になった企画のAI推定スコア</p>
              </>
            ) : (
              <p className="text-[13px] text-ink-muted">元企画のスコアはありません。</p>
            )}
            <CalendarAddButton
              brandId={script.brandId}
              scriptId={script.id}
              {...(script.ideaId ? { ideaId: script.ideaId } : {})}
              defaultTitle={script.title}
              defaultChannel={script.channel}
              defaultStatus="READY"
            />
          </CardBody>
        </Card>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-navy">ストーリーボード</h2>
          <span className="text-[11px] font-bold tracking-[0.14em] text-ink-subtle">{scenes.length} SCENES</span>
        </div>
        <div className="mt-4">
          <SceneBoard scriptId={script.id} scenes={scenes} totalSeconds={script.durationSec} />
        </div>
      </section>

      <div className="no-print mt-8 space-y-6">
        <ScriptQuickActions scriptId={script.id} durationSec={script.durationSec} />

        <BrandCheckPanel
          scriptId={script.id}
          check={
            latestCheck
              ? {
                  verdict: latestCheck.verdict,
                  findings: latestCheck.findings as unknown as { summary?: string; items?: { severity: string; excerpt: string; issue: string; suggestion: string }[] },
                  createdAt: latestCheck.createdAt.toISOString(),
                }
              : null
          }
        />

        <ProductionBriefPanel scriptId={script.id} brief={script.brief} />

        <VideoPromptPanel scriptId={script.id} prompts={prompts} sceneCount={scenes.length} />

        <CaptionPanel scriptId={script.id} captions={script.captions} />
      </div>
    </PageShell>
  )
}
