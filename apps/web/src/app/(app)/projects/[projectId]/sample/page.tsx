import { listSamples } from '@/features/samples/service'
import { SampleWorkspace } from './sample-workspace'

/** STEP 9: サンプル評価(要件48〜50)。 */
export default async function SamplePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const samples = await listSamples(projectId)

  return (
    <SampleWorkspace
      projectId={projectId}
      samples={samples.map((sample) => ({
        id: sample.id,
        round: sample.round,
        supplierName: sample.supplierName,
        comment: sample.comment,
        total: sample.total,
        decision: sample.decision,
        aiSummary: sample.aiSummary,
        aiFindings: sample.aiFindings as { area: string; issue: string; action: string; severity: string }[],
        scores: {
          design: sample.design,
          texture: sample.texture,
          weight: sample.weight,
          size: sample.size,
          durability: sample.durability,
          usability: sample.usability,
          cleanability: sample.cleanability,
          packaging: sample.packaging,
          competitiveness: sample.competitiveness,
        },
      }))}
    />
  )
}
