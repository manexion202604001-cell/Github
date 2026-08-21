import Link from 'next/link'
import { getProject } from '@/features/projects/service'
import { PROJECT_STAGES, STAGE_LABEL } from '@/features/projects/schema'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/feedback'
import { TaskList } from './task-list'

/** プロジェクトのホーム: 開発工程の進捗とタスク(要件8, 77)。 */
export default async function ProjectHomePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await getProject(projectId)
  const currentIndex = PROJECT_STAGES.indexOf(project.stage)

  const steps: { label: string; href: string; state: 'done' | 'current' | 'todo' }[] = [
    { label: '商品概要', href: 'overview', state: state(currentIndex, 0) },
    { label: '商品画像', href: 'images', state: state(currentIndex, 1) },
    { label: '市場調査', href: 'market', state: state(currentIndex, 2) },
    { label: '商品評価', href: 'score', state: state(currentIndex, 3) },
    { label: '利益シミュレーション', href: 'cost', state: state(currentIndex, 4) },
    { label: '商品仕様', href: 'spec', state: state(currentIndex, 5) },
    { label: 'OEM', href: 'oem', state: state(currentIndex, 6) },
    { label: 'サンプル', href: 'sample', state: state(currentIndex, 7) },
    { label: 'LP', href: 'lp', state: state(currentIndex, 8) },
    { label: 'PR動画', href: 'video', state: state(currentIndex, 9) },
    { label: '販売準備', href: 'launch', state: state(currentIndex, 10) },
    { label: '販売・分析', href: 'sales', state: state(currentIndex, 11) },
    { label: '改善', href: 'improvement', state: state(currentIndex, 12) },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="商品開発工程"
          description={`現在のステージ: ${STAGE_LABEL[project.stage]}`}
        />
        <CardBody>
          <Progress value={((currentIndex + 1) / PROJECT_STAGES.length) * 100} className="mb-5" />
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.href}>
                <Link
                  href={`/projects/${projectId}/${step.href}`}
                  className={
                    step.state === 'current'
                      ? 'flex items-center gap-2.5 border border-brand bg-brand-wash px-4 py-3 text-[13px] font-bold text-brand'
                      : step.state === 'done'
                        ? 'flex items-center gap-2.5 border border-line bg-surface px-4 py-3 text-[13px] font-semibold text-ink'
                        : 'flex items-center gap-2.5 border border-line bg-canvas-alt/50 px-4 py-3 text-[13px] font-semibold text-ink-subtle'
                  }
                >
                  <span
                    className={
                      step.state === 'done'
                        ? 'flex h-5 w-5 items-center justify-center bg-positive text-[10px] text-white'
                        : step.state === 'current'
                          ? 'flex h-5 w-5 items-center justify-center bg-brand text-[10px] text-white'
                          : 'flex h-5 w-5 items-center justify-center border border-line-strong text-[10px] text-ink-subtle'
                    }
                  >
                    {step.state === 'done' ? '✓' : index + 1}
                  </span>
                  {step.label}
                </Link>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="タスク" description="AIが生成した販売前チェックリストもここに表示されます。" />
        <CardBody>
          <TaskList
            tasks={project.tasks.map((task) => ({
              id: task.id,
              title: task.title,
              detail: task.detail,
              done: task.done,
              stage: STAGE_LABEL[task.stage],
            }))}
          />
        </CardBody>
      </Card>
    </div>
  )
}

function state(current: number, step: number): 'done' | 'current' | 'todo' {
  if (step < current) return 'done'
  if (step === current) return 'current'
  return 'todo'
}
