import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FlaskConical, Sparkles } from 'lucide-react'
import { getIdea } from '@/features/ideas/service'
import { AppError } from '@/lib/errors'
import { PageHeader, PageShell } from '@/components/layout/page-header'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreGauge, ScoreBar } from '@/components/ui/score-gauge'
import { SCORE_AXIS_LABELS } from '@/features/ideas/domain'
import { HookPanel } from '@/components/ideas/hook-panel'
import { IdeaEditor } from '@/components/ideas/idea-editor'
import { IdeaActions } from '@/components/ideas/idea-actions'
import { ScriptGenerateForm } from '@/components/scripts/generate-form'
import { CalendarAddButton } from '@/components/calendar/add-button'
import { channelLabel } from '@/lib/config/channels'
import { ideaCategoryLabel } from '@/lib/config/taxonomy'
import { formatSeconds } from '@/lib/format'

export const metadata: Metadata = { title: '企画の詳細' }
export const dynamic = 'force-dynamic'

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idea = await getIdea(id).catch((error) => {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  })

  const axes = idea.score

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: 'Ideas', href: '/ideas' }, { label: idea.title }]}
        title={idea.title}
        description={idea.summary}
        action={<IdeaActions ideaId={idea.id} isFavorite={idea.isFavorite} title={idea.title} />}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{ideaCategoryLabel(idea.category)}</Badge>
        <Badge tone="neutral">{channelLabel(idea.channel)}</Badge>
        <Badge tone="neutral">{formatSeconds(idea.durationSec)}</Badge>
        <Badge tone={idea.difficulty === 'LOW' ? 'positive' : idea.difficulty === 'HIGH' ? 'danger' : 'warning'}>
          制作難易度 {idea.difficulty}
        </Badge>
        {idea.research ? (
          <Link
            href={`/research/${idea.research.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            <FlaskConical className="h-3 w-3" aria-hidden="true" />
            {idea.research.title}
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Hook" description="冒頭3秒で視聴を決める一言です。" />
            <CardBody>
              <p className="rounded-[14px] bg-canvas-alt px-5 py-4 text-[17px] font-bold leading-snug text-navy">
                「{idea.hook}」
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="なぜこの企画なのか" description="調査結果とのつながりです。" />
            <CardBody className="space-y-4">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{idea.whyThisIdea}</p>
              <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <Detail label="ターゲット" value={idea.target ?? '未設定'} />
                <Detail label="CTA" value={idea.cta ?? '未設定'} />
              </div>
            </CardBody>
          </Card>

          <HookPanel ideaId={idea.id} hooks={idea.hooks} currentHook={idea.hook} />

          <div id="script" className="scroll-mt-24">
            <Card tone="raised">
              <CardHeader
                icon={<Sparkles className="h-4 w-4" />}
                title="この企画から台本を作る"
                description="シーン単位の台本に落とし込みます。尺・出演スタイル・トーンを選んでください。"
              />
              <CardBody>
                <ScriptGenerateForm ideaId={idea.id} defaultChannel={idea.channel} defaultDuration={idea.durationSec} />
                {idea.scripts.length > 0 ? (
                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-[12px] font-semibold text-ink-muted">この企画から作成した台本</p>
                    <ul className="mt-2 space-y-1.5">
                      {idea.scripts.map((script) => (
                        <li key={script.id}>
                          <Link
                            href={`/scripts/${script.id}`}
                            className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3 py-2 text-[13px] font-semibold text-navy transition-colors hover:border-brand/40 hover:text-brand"
                          >
                            <span className="min-w-0 truncate">{script.title}</span>
                            <Badge tone={script.status === 'READY' ? 'positive' : 'neutral'}>{script.status}</Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>

          <IdeaEditor idea={idea} />
        </div>

        <aside className="space-y-6">
          <Card tone="raised">
            <CardBody className="text-center">
              {axes ? (
                <>
                  <ScoreGauge value={axes.overall} size="lg" />
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{axes.reasoning}</p>
                </>
              ) : (
                <p className="py-6 text-[13px] text-ink-muted">まだ評価がありません。</p>
              )}
            </CardBody>
            {axes ? (
              <CardBody className="space-y-3 border-t border-line">
                {(Object.keys(SCORE_AXIS_LABELS) as (keyof typeof SCORE_AXIS_LABELS)[]).map((key) => (
                  <ScoreBar key={key} label={SCORE_AXIS_LABELS[key]} value={axes[key]} />
                ))}
              </CardBody>
            ) : null}
            <CardBody className="border-t border-line">
              <p className="text-[11px] leading-relaxed text-ink-subtle">
                これはAIによる推定評価です。拡散や成果を保証するものではありません。
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="カレンダーへ追加" description="投稿予定として登録します。" />
            <CardBody>
              <CalendarAddButton
                brandId={idea.brandId}
                ideaId={idea.id}
                defaultTitle={idea.title}
                defaultChannel={idea.channel}
              />
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-ink-subtle">{label}</p>
      <p className="mt-0.5 text-[13px] text-navy">{value}</p>
    </div>
  )
}
