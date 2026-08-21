import { z } from 'zod'
import type { AITask } from '@/server/ai-task'
import { formatProjectContext, BASE_SYSTEM } from './context'
import type { ProjectContextSnapshot } from '@/types/context'

export const sampleEvaluationSchema = z.object({
  total: z.number().int().min(0).max(100),
  decision: z.enum(['READY_FOR_PRODUCTION', 'NEEDS_FIX', 'NEEDS_RESAMPLE', 'REJECTED']),
  summary: z.string(),
  findings: z
    .array(z.object({ area: z.string(), issue: z.string(), action: z.string(), severity: z.enum(['LOW', 'MID', 'HIGH']) }))
    .default([]),
})

export type SampleEvaluationOutput = z.infer<typeof sampleEvaluationSchema>

export type SampleEvaluationInput = {
  context: ProjectContextSnapshot
  round: number
  scores: Record<string, number | null>
  comment: string | null
}

/** STEP 9: OEMサンプルを100点で評価し、量産可否を判定する(要件48〜50)。 */
export const sampleEvaluationTask: AITask<SampleEvaluationInput, SampleEvaluationOutput> = {
  id: 'sample-evaluation',
  system: `${BASE_SYSTEM}

OEMサンプルの評価結果から、量産可否を判定してください。

判定基準:
- 80点以上かつ HIGH severity の問題なし → READY_FOR_PRODUCTION
- 65〜79点 → NEEDS_FIX(修正して量産可)
- 50〜64点 → NEEDS_RESAMPLE(再サンプル必須)
- 49点以下 → REJECTED

findings の action は、OEMへそのまま伝えられる指示文で書くこと。`,
  schema: sampleEvaluationSchema,
  buildUser: (input) =>
    `${formatProjectContext(input.context)}\n\n## サンプル評価(第${input.round}回)\n${Object.entries(input.scores)
      .map(([key, value]) => `${key}: ${value ?? '未評価'}`)
      .join('\n')}\n\n## 評価コメント\n${input.comment ?? '(なし)'}\n\n量産可否を判定してください。`,
  mock: (input) => {
    const values = Object.values(input.scores).filter((value): value is number => typeof value === 'number')
    const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 70
    const total = Math.round(Math.min(100, average * 10))
    return {
      total,
      decision: total >= 80 ? ('READY_FOR_PRODUCTION' as const) : total >= 65 ? ('NEEDS_FIX' as const) : ('NEEDS_RESAMPLE' as const),
      summary: `【サンプル】総合${total}点。基本構造は要求仕様を満たしていますが、仕上げと梱包に改善余地があります。`,
      findings: [
        {
          area: '質感',
          issue: '本体表面のパーティングラインが指に触れる位置に出ている',
          action: '金型の合わせ位置を側面下部へ移動し、バリを0.1mm以下に抑えてください。',
          severity: 'MID' as const,
        },
        {
          area: '梱包',
          issue: '緩衝材が薄く、輸送時の角部破損リスクがある',
          action: '四隅にパルプモールドの角当てを追加し、1.0m落下試験に合格する仕様へ変更してください。',
          severity: 'HIGH' as const,
        },
      ],
    }
  },
}
