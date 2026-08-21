import Link from 'next/link'
import { getDashboard } from '@/features/projects/service'
import { STAGE_LABEL, PROJECT_STAGES } from '@/features/projects/schema'
import { formatCurrency, formatPercent, relativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Stat } from '@/components/ui/stat'
import { EmptyState, Progress } from '@/components/ui/feedback'

export const dynamic = 'force-dynamic'

const DECISION_TONE = { GO: 'positive', IMPROVE_GO: 'caution', NO_GO: 'critical' } as const

export default async function DashboardPage() {
  const dashboard = await getDashboard()
  const { stats, projects, openTasks, recentJobs } = dashboard

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ダッシュボード</h1>
          <p className="mt-1 text-[13px] text-ink-muted">商品開発の状況をひと目で確認できます。</p>
        </div>
        <Link href="/projects/new">
          <Button>+ 新しい商品プロジェクト</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="開発中プロジェクト" value={stats.active} sub={`全 ${stats.total} 件`} />
        <Stat label="平均 市場評価スコア" value={stats.averageScore ?? '—'} sub="100点満点" tone="brand" />
        <Stat label="想定月間売上(合計)" value={formatCurrency(stats.estimatedMonthlyRevenue)} />
        <Stat
          label="平均 想定利益率"
          value={stats.averageProfitRate === null ? '—' : formatPercent(stats.averageProfitRate)}
          sub={`未完了タスク ${stats.openTasks} 件`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="商品プロジェクト" description="最近更新された順に表示しています。" />
          <CardBody className="p-0">
            {projects.length === 0 ? (
              <EmptyState
                title="最初のプロジェクトを作成しましょう"
                description="「こんな商品を作りたい」と入力するだけで、AIが商品企画を組み立てます。"
                action={
                  <Link href="/projects/new">
                    <Button>プロジェクトを作成</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-line/70">
                {projects.map((project) => {
                  const stageIndex = PROJECT_STAGES.indexOf(project.stage)
                  return (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.id}`}
                        className="block px-6 py-4 transition-colors hover:bg-canvas-alt/60"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">{project.name}</p>
                          <div className="flex items-center gap-2">
                            {project.decision ? (
                              <Badge tone={DECISION_TONE[project.decision as keyof typeof DECISION_TONE] ?? 'neutral'}>
                                {project.decision} {project.score !== null ? `${project.score}点` : ''}
                              </Badge>
                            ) : null}
                            <Badge tone="brand">{STAGE_LABEL[project.stage]}</Badge>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-ink-muted">
                          <span>{project.category ?? 'カテゴリ未設定'}</span>
                          {project.estimatedMonthlyRevenue !== null ? (
                            <span>想定月商 {formatCurrency(project.estimatedMonthlyRevenue)}</span>
                          ) : null}
                          {project.estimatedProfitRate !== null ? (
                            <span>利益率 {formatPercent(project.estimatedProfitRate)}</span>
                          ) : null}
                          <span>{relativeTime(project.updatedAt)} 更新</span>
                        </div>
                        <div className="mt-3">
                          <Progress value={((stageIndex + 1) / PROJECT_STAGES.length) * 100} />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="未完了タスク" />
            <CardBody className="p-0">
              {openTasks.length === 0 ? (
                <p className="px-6 py-8 text-center text-[13px] text-ink-muted">未完了のタスクはありません。</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {openTasks.map((task) => (
                    <li key={task.id} className="px-6 py-3">
                      <Link href={`/projects/${task.projectId}`} className="block">
                        <p className="text-[13px] leading-relaxed font-semibold">{task.title}</p>
                        <p className="mt-0.5 text-[12px] text-ink-subtle">
                          {task.projectName} / {STAGE_LABEL[task.stage]}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="最近のAI処理" />
            <CardBody className="p-0">
              {recentJobs.length === 0 ? (
                <p className="px-6 py-8 text-center text-[13px] text-ink-muted">まだAI処理の履歴がありません。</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {recentJobs.map((job) => (
                    <li key={job.id} className="flex items-center justify-between gap-3 px-6 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{job.handler}</p>
                        <p className="text-[12px] text-ink-subtle">{relativeTime(job.createdAt)}</p>
                      </div>
                      <Badge
                        tone={
                          job.status === 'COMPLETED'
                            ? 'positive'
                            : job.status === 'FAILED'
                              ? 'critical'
                              : job.status === 'CANCELLED'
                                ? 'neutral'
                                : 'brand'
                        }
                      >
                        {job.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
