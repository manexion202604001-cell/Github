import 'server-only'
import { registerJobHandler } from './handlers'
import { productJobHandlers } from '@/features/products/jobs'
import { imageJobHandlers } from '@/features/images/jobs'
import { marketResearchJobHandlers } from '@/features/market-research/jobs'
import { scoringJobHandlers } from '@/features/scoring/jobs'
import { specificationJobHandlers } from '@/features/specifications/jobs'
import { sampleJobHandlers } from '@/features/samples/jobs'
import { lpJobHandlers } from '@/features/lp/jobs'
import { videoJobHandlers } from '@/features/video/jobs'
import { improvementJobHandlers } from '@/features/improvements/jobs'

let registered = false

/**
 * 全 feature の Job ハンドラを登録する。
 * API Route / Worker のどちらから入っても必ず最初に呼ぶ。
 */
export function ensureJobHandlersRegistered(): void {
  if (registered) return
  registered = true

  const all = {
    ...productJobHandlers,
    ...imageJobHandlers,
    ...marketResearchJobHandlers,
    ...scoringJobHandlers,
    ...specificationJobHandlers,
    ...sampleJobHandlers,
    ...lpJobHandlers,
    ...videoJobHandlers,
    ...improvementJobHandlers,
  }

  for (const [name, handler] of Object.entries(all)) {
    registerJobHandler(name, handler)
  }
}
