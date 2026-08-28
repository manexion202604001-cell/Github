import { z } from 'zod'
import { SCRIPT_STYLE_KEYS, SCRIPT_TONE_KEYS } from '@/lib/config/taxonomy'
import { VIDEO_PRESET_KEYS } from '@/lib/config/video-presets'
import { channelKey, cuid, longText, optionalShortText, shortText, stringList } from './common'

export const SCRIPT_DURATIONS = [15, 30, 45, 60] as const

export const generateScriptSchema = z.object({
  ideaId: cuid,
  channel: channelKey,
  durationSec: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  style: z.string().refine((value) => SCRIPT_STYLE_KEYS.includes(value), '対応していない出演スタイルです'),
  tone: z.string().refine((value) => SCRIPT_TONE_KEYS.includes(value), '対応していないトーンです'),
  hook: z.string().trim().max(200).optional(),
})

export const sceneSchema = z.object({
  startSecond: z.coerce.number().int().min(0).max(3600),
  endSecond: z.coerce.number().int().min(0).max(3600),
  visual: longText.min(1, '映像の内容を入力してください'),
  voice: z.string().trim().max(4000),
  onscreenText: z.string().trim().max(200).optional().or(z.literal('')),
  camera: optionalShortText,
  assets: stringList,
  purpose: optionalShortText,
})

export const scriptEditSchema = z.object({
  title: shortText,
  channel: channelKey,
  durationSec: z.coerce.number().int().min(5).max(600),
  style: z.string().refine((value) => SCRIPT_STYLE_KEYS.includes(value), '対応していない出演スタイルです'),
  tone: z.string().refine((value) => SCRIPT_TONE_KEYS.includes(value), '対応していないトーンです'),
  hook: shortText,
  cta: optionalShortText,
})

/** 台本全体へのAI修正指示(要件33)。 */
export const scriptRefineSchema = z.object({
  scriptId: cuid,
  instruction: z.string().trim().min(1, '修正内容を入力してください').max(400),
  targetDurationSec: z.coerce.number().int().min(5).max(600).optional(),
})

export const videoPromptSchema = z.object({
  scriptId: cuid,
  preset: z.string().refine((value) => VIDEO_PRESET_KEYS.includes(value), '対応していないプリセットです'),
  language: z.enum(['en', 'ja']),
})

export type GenerateScriptInput = z.infer<typeof generateScriptSchema>
export type SceneInput = z.infer<typeof sceneSchema>
export type ScriptEditInput = z.infer<typeof scriptEditSchema>
export type ScriptRefineInput = z.infer<typeof scriptRefineSchema>
export type VideoPromptInput = z.infer<typeof videoPromptSchema>
