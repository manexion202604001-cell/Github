import { getCurrentSpecification, listSpecifications } from '@/features/specifications/service'
import { toStringArray } from '@/features/assistant/context'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/feedback'
import { JobLauncher } from '@/components/job-launcher'
import { OEMDocumentView } from './oem-document-view'

/** STEP 7-8: 商品仕様 → OEM仕様書(要件42〜45)。 */
export default async function SpecPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const [specification, versions] = await Promise.all([
    getCurrentSpecification(projectId),
    listSpecifications(projectId),
  ])

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="商品仕様"
          description="市場分析・レビュー不満・原価目標を反映した、量産に渡せる粒度の仕様をAIが提案します。"
          action={
            versions.length > 0 ? <Badge tone="brand">v{specification?.version ?? versions[0]?.version}</Badge> : undefined
          }
        />
        <CardBody className="space-y-5">
          <JobLauncher
            label={specification ? '仕様を再生成(新Version)' : 'AIで商品仕様を作成'}
            path="/api/specifications"
            body={{ projectId, action: 'spec' }}
          />

          {!specification ? (
            <EmptyState
              title="商品仕様はまだ作成されていません"
              description="市場調査と利益シミュレーションを済ませてから生成すると、精度が上がります。"
            />
          ) : (
            <div className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['サイズ', specification.size],
                    ['重量', specification.weight],
                    ['材質', specification.material],
                    ['カラー', specification.color],
                    ['構造', specification.structure],
                    ['電源', specification.power],
                    ['パッケージ', specification.packaging],
                  ] as const
                ).map(([label, value]) =>
                  value ? (
                    <div key={label} className=" border border-line bg-canvas px-4 py-3">
                      <dt className="text-[12px] font-semibold text-ink-subtle">{label}</dt>
                      <dd className="mt-0.5 text-[13px] leading-relaxed font-semibold">{value}</dd>
                    </div>
                  ) : null,
                )}
              </dl>

              <SpecList label="機能" items={toStringArray(specification.features)} />
              <SpecList label="付属品" items={toStringArray(specification.accessories)} />
              <SpecList label="品質条件" items={toStringArray(specification.qualityStandards)} />
              <SpecList label="注意事項・法規" items={toStringArray(specification.cautions)} />

              {specification.rationale ? (
                <div className=" bg-brand-wash/60 px-4 py-3">
                  <p className="text-[12px] font-bold text-brand">この仕様にした理由</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{specification.rationale}</p>
                </div>
              ) : null}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="OEM仕様書"
          description="製造会社へそのまま提出できる仕様書を生成します。印刷またはブラウザのPDF保存で出力できます。"
        />
        <CardBody className="space-y-5">
          <JobLauncher
            label="OEM仕様書を生成"
            path="/api/specifications"
            body={{ projectId, action: 'oem-document' }}
            variant="secondary"
          />
          {specification?.documents.length ? (
            <OEMDocumentView
              documents={specification.documents.map((document) => ({
                id: document.id,
                title: document.title,
                kind: document.kind,
                version: document.version,
                content: document.content,
                createdAt: document.createdAt.toISOString(),
              }))}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}

function SpecList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[13px] font-bold">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className=" border border-line bg-surface px-3.5 py-2 text-[13px] text-ink-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
