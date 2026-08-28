import { z } from 'zod'
import { RESEARCH_DEPTHS, RESEARCH_OBJECTIVES } from '@/lib/config/taxonomy'
import { channelKey, cuid, optionalLongText, publicUrl, shortText, stringList } from './common'

const objectiveKeys = RESEARCH_OBJECTIVES.map((objective) => objective.key)
const depthKeys = RESEARCH_DEPTHS.map((depth) => depth.key)

export const researchInputSchema = z.object({
  brandId: cuid,
  title: shortText,
  channel: channelKey,
  region: shortText,
  objective: z.string().refine((value) => objectiveKeys.includes(value), '対応していない調査目的です'),
  depth: z.enum(depthKeys as [string, ...string[]]),
  keywords: stringList,
  competitorUrls: z.array(publicUrl).max(10, '競合URLは10件までです').default([]),
  freeText: optionalLongText,
})

export type ResearchInput = z.infer<typeof researchInputSchema>
