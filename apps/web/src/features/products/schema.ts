import { z } from 'zod'
import { optionalString, stringArray } from '@/validators/common'

/** 商品概要項目(要件12)。 */
export const PRODUCT_FIELDS = [
  { key: 'name', label: '商品名', kind: 'text' },
  { key: 'category', label: '商品カテゴリ', kind: 'text' },
  { key: 'purpose', label: '商品の目的', kind: 'textarea' },
  { key: 'problem', label: '解決する課題', kind: 'textarea' },
  { key: 'target', label: '想定ユーザー', kind: 'textarea' },
  { key: 'price', label: '想定価格', kind: 'number' },
  { key: 'country', label: '想定販売国', kind: 'text' },
  { key: 'channel', label: '販売チャネル', kind: 'text' },
  { key: 'size', label: 'サイズ', kind: 'text' },
  { key: 'weight', label: '重量', kind: 'text' },
  { key: 'material', label: '素材', kind: 'text' },
  { key: 'color', label: 'カラー', kind: 'text' },
  { key: 'designNote', label: 'デザイン', kind: 'textarea' },
  { key: 'features', label: '主要機能', kind: 'list' },
  { key: 'usp', label: '差別化案', kind: 'list' },
  { key: 'description', label: '商品概要', kind: 'textarea' },
  { key: 'notes', label: 'その他要望', kind: 'textarea' },
] as const

export type ProductFieldKey = (typeof PRODUCT_FIELDS)[number]['key']

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: optionalString(80),
  description: optionalString(8000),
  purpose: optionalString(2000),
  problem: optionalString(2000),
  target: optionalString(2000),
  price: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
  country: optionalString(80),
  channel: optionalString(120),
  size: optionalString(200),
  weight: optionalString(120),
  material: optionalString(400),
  color: optionalString(200),
  designNote: optionalString(2000),
  features: stringArray.optional(),
  usp: stringArray.optional(),
  references: z.array(z.object({ label: z.string().max(200), url: z.string().url().max(1000) })).max(20).optional(),
  notes: optionalString(4000),
})

export const interviewAnswerSchema = z.object({
  answers: z.array(z.object({ question: z.string().max(500), answer: z.string().max(4000) })).max(20).default([]),
  rawInput: z.string().max(8000).optional(),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type InterviewAnswerInput = z.infer<typeof interviewAnswerSchema>
