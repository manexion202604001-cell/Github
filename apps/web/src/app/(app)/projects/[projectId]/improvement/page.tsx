import { listImprovements } from '@/features/improvements/service'
import { listProductVersions } from '@/features/products/service'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { formatDateTime } from '@/lib/format'
import { JobLauncher } from '@/components/job-launcher'
import { ImprovementList } from './improvement-list'

/** STEP 5 / 13-14: 改善提案・商品Version・次回ロット(要件35, 72〜76)。 */
export default async function ImprovementPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [improvements, versions] = await Promise.all([listImprovements(projectId), listProductVersions(projectId)])

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="AI商品改善"
          description="競合レビュー・スコア・販売実績から、仕様・価格・画像・LP・広告などの改善案を生成します。"
        />
        <CardBody className="flex flex-wrap gap-3">
          <JobLauncher label="開発前の仕様改善案を生成" path="/api/improvements" body={{ projectId, phase: 'DESIGN' }} />
          <JobLauncher
            label="販売後の改善案(次回ロット)を生成"
            path="/api/improvements"
            body={{ projectId, phase: 'POST_SALE' }}
            variant="secondary"
          />
        </CardBody>
      </Card>

      {improvements.length === 0 ? (
        <EmptyState
          title="改善提案はまだありません"
          description="市場調査・レビュー解析・販売データが揃うほど、提案の精度が上がります。"
        />
      ) : (
        <ImprovementList
          projectId={projectId}
          improvements={improvements.map((improvement) => ({
            id: improvement.id,
            target: improvement.target,
            status: improvement.status,
            title: improvement.title,
            currentState: improvement.currentState,
            proposal: improvement.proposal,
            reason: improvement.reason,
            expectedEffect: improvement.expectedEffect,
            priority: improvement.priority,
          }))}
        />
      )}

      <Card>
        <CardHeader title="商品Version履歴" description="仕様の世代管理(要件74)。改善のたびに新Versionが積まれます。" />
        <CardBody className="p-0">
          {versions.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-ink-muted">まだVersionがありません。商品仕様を生成すると v1 が作成されます。</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {versions.map((version) => (
                <li key={version.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-bold">
                      Version {version.version}
                      {version.isCurrent ? <span className="ml-2 text-[11px] font-semibold text-brand">現行</span> : null}
                    </p>
                    <p className="text-[12px] text-ink-subtle">{formatDateTime(version.createdAt)}</p>
                  </div>
                  {version.changeReason ? <p className="mt-1 text-[13px] text-ink-muted">{version.changeReason}</p> : null}
                  {version.expectedEffect ? (
                    <p className="mt-0.5 text-[12px] text-ink-subtle">予想効果: {version.expectedEffect}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
