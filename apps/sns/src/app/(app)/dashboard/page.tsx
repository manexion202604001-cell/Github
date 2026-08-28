import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Calendar, FileText, FlaskConical, Lightbulb, Search } from 'lucide-react'
import { requireOrganization } from '@/server/authz'
import { getCurrentUser } from '@/server/auth/session'
import { listBrands } from '@/features/brands/service'
import { loadDashboard } from '@/features/dashboard/service'
import { PageShell } from '@/components/layout/page-header'
import { Card, CardBody, SectionHeading } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ScoreGauge } from '@/components/ui/score-gauge'
import { ActivityChart } from '@/components/dashboard/activity-chart'
import { CategoryChart } from '@/components/dashboard/category-chart'
import { DashboardHero } from '@/components/dashboard/hero'
import { channelLabel } from '@/lib/config/channels'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = { title: 'ダッシュボード' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireOrganization()
  const user = await getCurrentUser()
  const brands = await listBrands()
  if (brands.length === 0) redirect('/onboarding')

  const params = await searchParams
  const requestedBrandId = typeof params.brandId === 'string' ? params.brandId : undefined
  const brand = brands.find((item) => item.id === requestedBrandId) ?? brands[0]!

  return (
    <PageShell>
      <DashboardHero userName={user?.name ?? ''} brandName={brand.name} brandId={brand.id} />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent brandId={brand.id} />
      </Suspense>
    </PageShell>
  )
}

async function DashboardContent({ brandId }: { brandId: string }) {
  const data = await loadDashboard(brandId)

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="保存済み企画" value={data.kpi.ideaCount} unit="件" delta={data.kpi.ideaDelta} icon={<Lightbulb className="h-4 w-4" />} href={`/ideas?brandId=${brandId}`} />
        <StatCard label="作成済み台本" value={data.kpi.scriptCount} unit="件" delta={data.kpi.scriptDelta} icon={<FileText className="h-4 w-4" />} href={`/scripts?brandId=${brandId}`} />
        <StatCard label="調査レポート" value={data.kpi.researchCount} unit="件" delta={data.kpi.researchDelta} icon={<FlaskConical className="h-4 w-4" />} href={`/research?brandId=${brandId}`} />
        <StatCard label="今月の投稿予定" value={data.kpi.plannedThisMonth} unit="件" icon={<Calendar className="h-4 w-4" />} href={`/calendar?brandId=${brandId}`} />
      </div>

      <section className="mt-10">
        <SectionHeading title="次にやること" description="この順番で進めると、発信までが最短です。" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction href={`/research/new?brandId=${brandId}`} icon={<Search className="h-5 w-5" />} title="市場調査をする" description="AIが検索計画を立て、根拠を集めます。" primary />
          <QuickAction href={`/ideas?brandId=${brandId}`} icon={<Lightbulb className="h-5 w-5" />} title="企画を考える" description="調査を根拠に企画を生成します。" />
          <QuickAction href={`/scripts?brandId=${brandId}`} icon={<FileText className="h-5 w-5" />} title="台本を作る" description="シーン単位の台本に落とし込みます。" />
          <QuickAction href={`/calendar?brandId=${brandId}`} icon={<Calendar className="h-5 w-5" />} title="カレンダーを見る" description="投稿予定を確認します。" />
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-[15px] font-bold text-navy">最近の調査</h2>
              <p className="mt-0.5 text-[12px] text-ink-muted">直近の市場調査レポート</p>
            </div>
            <Link href={`/research?brandId=${brandId}`} className="text-[12px] font-semibold text-brand hover:underline">
              すべて見る
            </Link>
          </div>
          <CardBody className="space-y-2">
            {data.recentResearch.length === 0 ? (
              <EmptyState
                className="border-0 py-8"
                icon={<FlaskConical className="h-6 w-6" />}
                title="まだ市場調査がありません"
                description="最初の調査を実行すると、企画の根拠になるインサイトが蓄積されます。"
                action={
                  <LinkButton href={`/research/new?brandId=${brandId}`} variant="gradient">
                    最初の市場調査を始める
                  </LinkButton>
                }
              />
            ) : (
              data.recentResearch.map((run) => (
                <Link
                  key={run.id}
                  href={`/research/${run.id}`}
                  className="flex items-center justify-between gap-4 rounded-[14px] border border-line px-4 py-3 transition-colors hover:border-brand/35 hover:bg-brand-wash/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-navy">{run.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      {formatDate(run.createdAt)} ・ 出典 {run.sourceCount}件
                    </p>
                  </div>
                  <Badge tone={run.status === 'COMPLETED' ? 'positive' : run.status === 'FAILED' ? 'danger' : 'brand'}>
                    {run.status === 'COMPLETED' ? '完了' : run.status === 'FAILED' ? '失敗' : '実行中'}
                  </Badge>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-bold text-navy">SNSコンテンツ状況</h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">カテゴリー別の企画数</p>
          </div>
          <CardBody>
            <CategoryChart data={data.categoryBreakdown} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-bold text-navy">作成の推移</h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">直近8週間</p>
          </div>
          <CardBody>
            <ActivityChart data={data.weeklyActivity} />
          </CardBody>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-[15px] font-bold text-navy">最近の企画</h2>
              <p className="mt-0.5 text-[12px] text-ink-muted">AI推定スコア付き</p>
            </div>
            <Link href={`/ideas?brandId=${brandId}`} className="text-[12px] font-semibold text-brand hover:underline">
              すべて見る
            </Link>
          </div>
          <CardBody className="space-y-2">
            {data.recentIdeas.length === 0 ? (
              <EmptyState
                className="border-0 py-8"
                icon={<Lightbulb className="h-6 w-6" />}
                title="まだ企画がありません"
                description="市場調査の結果から、SNS企画をまとめて生成できます。"
                action={
                  <LinkButton href={`/ideas?brandId=${brandId}`} variant="secondary">
                    企画を作成する
                  </LinkButton>
                }
              />
            ) : (
              data.recentIdeas.map((idea) => (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  className="flex items-center gap-4 rounded-[14px] border border-line px-4 py-3 transition-colors hover:border-brand/35 hover:bg-brand-wash/40"
                >
                  {idea.score !== null ? <ScoreGauge value={idea.score} size="sm" /> : <span className="w-14 text-center text-[11px] text-ink-subtle">未評価</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-navy">{idea.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{channelLabel(idea.channel)}</p>
                  </div>
                  <Badge tone={idea.status === 'SCRIPTED' ? 'positive' : 'neutral'}>
                    {idea.status === 'SCRIPTED' ? '台本あり' : '企画'}
                  </Badge>
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
  primary = false,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'gradient-brand group rounded-[18px] px-5 py-5 text-white shadow-[0_10px_28px_rgba(19,93,255,0.25)] transition-transform hover:-translate-y-0.5'
          : 'group rounded-[18px] border border-line bg-surface px-5 py-5 shadow-[0_8px_30px_rgba(15,39,80,0.06)] transition-[transform,border-color] hover:-translate-y-0.5 hover:border-brand/35'
      }
    >
      <span className={primary ? 'flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/20' : 'flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand-wash text-brand'}>
        {icon}
      </span>
      <h3 className={primary ? 'mt-4 text-[15px] font-bold' : 'mt-4 text-[15px] font-bold text-navy'}>{title}</h3>
      <p className={primary ? 'mt-1 text-[13px] leading-relaxed text-white/85' : 'mt-1 text-[13px] leading-relaxed text-ink-muted'}>{description}</p>
      <span className={primary ? 'mt-3 inline-flex items-center gap-1 text-[12px] font-bold' : 'mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-brand'}>
        開く
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard key={index} className="h-[128px]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SkeletonCard className="h-[280px]" />
        <SkeletonCard className="h-[280px]" />
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
