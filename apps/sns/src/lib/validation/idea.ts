import { z } from 'zod'
import { DIFFICULTY_KEYS, IDEA_CATEGORY_KEYS } from '@/lib/config/taxonomy'
import { channelKey, cuid, longText, optionalShortText, shortText } from './common'

export const IDEA_COUNTS = [10, 20, 30] as const

export const generateIdeasSchema = z.object({
  brandId: cuid,
  researchId: cuid.optional(),
  channel: channelKey,
  count: z.union([z.literal(10), z.literal(20), z.literal(30)]).default(20),
})

export const ideaEditSchema = z.object({
  title: shortText,
  category: z.string().refine((value) => IDEA_CATEGORY_KEYS.includes(value), '対応していないカテゴリーです'),
  channel: channelKey,
  hook: shortText,
  summary: longText,
  whyThisIdea: longText,
  target: optionalShortText,
  cta: optionalShortText,
  durationSec: z.coerce.number().int().min(5).max(600),
  difficulty: z.string().refine((value) => DIFFICULTY_KEYS.includes(value), '対応していない難易度です'),
})

export type GenerateIdeasInput = z.infer<typeof generateIdeasSchema>
export type IdeaEditInput = z.infer<typeof ideaEditSchema>
