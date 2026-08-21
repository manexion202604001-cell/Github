import { getLaunchChecklist } from '@/features/improvements/service'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { JobLauncher } from '@/components/job-launcher'
import { TaskList } from '../task-list'

/** STEP 12: 販売準備チェックリスト(要件69)。 */
export default async function LaunchPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const tasks = await getLaunchChecklist(projectId)

  return (
    <Card>
      <CardHeader
        title="販売前チェックリスト"
        description="商品画像・タイトル・価格・在庫・LP・動画・広告・SEO・OEM・物流などの準備状況をAIが棚卸しします。"
      />
      <CardBody className="space-y-5">
        <JobLauncher
          label={tasks.length > 0 ? 'チェックリストを再生成' : 'AIチェックリストを生成'}
          path="/api/improvements"
          body={{ projectId, checklist: true }}
        />
        {tasks.length === 0 ? (
          <EmptyState
            title="チェックリストはまだありません"
            description="プロジェクトの現状を見て、販売開始までに必要な項目をAIが洗い出します。"
          />
        ) : (
          <TaskList
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              detail: task.detail,
              done: task.done,
              stage: '販売準備',
            }))}
          />
        )}
      </CardBody>
    </Card>
  )
}
