import { z } from 'zod'
import { CHANNEL_KEYS } from '@/lib/config/channels'
import { SNS_GOALS } from '@/lib/config/taxonomy'
import { channelKey, optionalLongText, optionalPublicUrl, optionalShortText, shortText, stringList } from './common'

const goalKeys = SNS_GOALS.map((goal) => goal.key)

export const brandSchema = z.object({
  name: shortText,
  industry: optionalShortText,
  website: optionalPublicUrl,
  region: optionalShortText,
  description: optionalLongText,
  targetCustomer: optionalLongText,
  brandTone: optionalShortText,
  snsChannels: z.array(channelKey).max(CHANNEL_KEYS.length).default([]),
  snsGoals: z.array(z.string().refine((value) => goalKeys.includes(value), '対応していない目的です')).max(goalKeys.length).default([]),
  brandKeywords: stringList,
  additionalContext: optionalLongText,
})

export const brandProductSchema = z.object({
  name: shortText,
  description: optionalLongText,
  priceRange: optionalShortText,
  strengths: stringList,
  weaknesses: stringList,
  differentiation: optionalLongText,
  customerProblems: stringList,
  customerNeeds: stringList,
  purchaseReasons: stringList,
})

export const brandRuleSchema = z.object({
  prohibitedWords: stringList,
  preferredWords: stringList,
  tone: optionalShortText,
  allowCompetitorNames: z.boolean().default(false),
  avoidExpressions: stringList,
  legalNotes: optionalLongText,
  regulatoryNotes: optionalLongText,
  internalRules: optionalLongText,
  preferredCta: optionalShortText,
  visualPreferences: optionalLongText,
})

export const competitorSchema = z.object({
  name: shortText,
  website: optionalPublicUrl,
  instagramUrl: optionalPublicUrl,
  tiktokUrl: optionalPublicUrl,
  youtubeUrl: optionalPublicUrl,
  notes: optionalLongText,
})

/** オンボーディング4ステップをまとめて受け取る(要件10)。 */
export const onboardingSchema = z.object({
  company: z.object({
    name: shortText,
    website: optionalPublicUrl,
    industry: optionalShortText,
    region: optionalShortText,
    description: optionalLongText,
  }),
  product: z.object({
    name: optionalShortText,
    description: optionalLongText,
    priceRange: optionalShortText,
    strengths: stringList,
    differentiation: optionalLongText,
    purchaseReasons: stringList,
  }),
  target: z.object({
    summary: optionalLongText,
    ageRange: optionalShortText,
    gender: optionalShortText,
    region: optionalShortText,
    segment: optionalShortText,
    occupation: optionalShortText,
    problems: stringList,
    needs: stringList,
  }),
  goals: z.array(z.string().refine((value) => goalKeys.includes(value), '対応していない目的です')).min(1, '1つ以上選択してください'),
  channels: z.array(channelKey).min(1, '1つ以上選択してください'),
})

export type BrandInput = z.infer<typeof brandSchema>
export type BrandProductInput = z.infer<typeof brandProductSchema>
export type BrandRuleInput = z.infer<typeof brandRuleSchema>
export type CompetitorInput = z.infer<typeof competitorSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
