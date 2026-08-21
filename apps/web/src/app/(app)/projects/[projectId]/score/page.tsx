import { getLatestScore, SCORE_ITEMS, DECISION_LABEL } from '@/features/scoring/service'
import { toStringArray } from '@/features/assistant/context'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ScoreBar } from '@/components/ui/stat'
import { Badge } from '@/components/ui/badge'
import { ScoreActions } from './score-actions'

/** STEP 4: AI商品評価(要件29〜34)。 */
export default async function ScorePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const score = await getLatestScore(projectId)
  const decision = score ? DECISION_LABEL[score.decision] : null

  const improvements = (score?.improvements ?? []) as unknown as {
    item: string
    current: string
    recommended: string
    reason: string
  }[]
  const alternatives = (score?.alternativeIdeas ?? []) as unknown as { name: string; reason: string }[]

  return (
    <div className="space-y-5">
      <ScoreActions projectId={projectId} hasScore={score !== null} />

      {score && decision ? (
        <>
          <Card>
            <CardBody className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-center sm:gap-14">
              <div className="text-center">
                <p className="tabular text-6xl font-bold text-ink">
                  {score.total}
                  <span className="text-xl text-ink-subtle"> / 100</span>
                </p>
                <p className="mt-1 text-[12px] text-ink-subtle">AI商品スコア</p>
              </div>
              <div className="text-center">
                <Badge
                  tone={decision.tone === 'go' ? 'positive' : decision.tone === 'warn' ? 'caution' : 'critical'}
                  className="px-5 py-1.5 text-[15px]"
                >
                  {decision.label}
                </Badge>
                <p className="mt-2 text-[13px] text-ink-muted">{decision.description}</p>
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="評価内訳" />
              <CardBody className="space-y-4">
                {SCORE_ITEMS.map((item) => (
                  <ScoreBar
                    key={item.key}
                    label={item.label}
                    value={score[item.key as keyof typeof score] as number}
                    max={item.max}
                  />
                ))}
              </CardBody>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="判定理由" />
                <CardBody>
                  <p className="text-[14px] leading-7 text-ink-muted">{score.reason}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[13px] font-bold text-positive">強み</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-ink-muted">
                        {toStringArray(score.strengths).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-critical">弱み</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-ink-muted">
                        {toStringArray(score.weaknesses).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {improvements.length > 0 ? (
                <Card>
                  <CardHeader title="AI改善提案" description="IMPROVE GO の場合、これらを反映すると開発可能な水準に到達します。" />
                  <CardBody className="space-y-3">
                    {improvements.map((improvement) => (
                      <div key={improvement.item} className=" border border-line bg-canvas p-4">
                        <p className="text-[13px] font-bold">{improvement.item}</p>
                        <p className="mt-1 text-[13px]">
                          <span className="text-ink-subtle line-through">{improvement.current}</span>
                          <span className="mx-2 text-brand">→</span>
                          <span className="font-bold text-brand">{improvement.recommended}</span>
                        </p>
                        <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{improvement.reason}</p>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              ) : null}

              {alternatives.length > 0 ? (
                <Card>
                  <CardHeader title="代替商品アイデア" description="NO GO の場合の代替案です。" />
                  <CardBody className="space-y-3">
                    {alternatives.map((idea) => (
                      <div key={idea.name} className=" border border-line bg-canvas p-4">
                        <p className="text-[13px] font-bold">{idea.name}</p>
                        <p className="mt-1 text-[12px] text-ink-muted">{idea.reason}</p>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
