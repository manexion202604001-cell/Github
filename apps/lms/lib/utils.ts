import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

function toJstParts(input: Date | string | number) {
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
    weekday: WEEKDAYS[jst.getUTCDay()] ?? '',
    hour: jst.getUTCHours(),
    minute: jst.getUTCMinutes(),
  }
}

/** JST で `2026年9月9日（水）` 形式に整形する */
export function formatDate(input: Date | string | number | null | undefined): string {
  if (!input) return ''
  const { year, month, day, weekday } = toJstParts(input)
  return `${year}年${month}月${day}日（${weekday}）`
}

/** JST で `2026年9月9日（水）20:00` 形式に整形する */
export function formatDateTime(input: Date | string | number | null | undefined): string {
  if (!input) return ''
  const { hour, minute } = toJstParts(input)
  return `${formatDate(input)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** JST の日付（YYYY-MM-DD） */
export function toJstDateString(input: Date | string | number = new Date()): string {
  const { year, month, day } = toJstParts(input)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 相対時間（「3分前」など） */
export function formatRelative(input: Date | string | number, now: Date = new Date()): string {
  const d = new Date(input).getTime()
  const diff = Math.max(0, now.getTime() - d)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}時間前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}日前`
  return formatDate(input)
}

export function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return Array.from(trimmed).slice(0, 1).join('')
}

export function truncate(text: string, max: number): string {
  const chars = Array.from(text)
  return chars.length <= max ? text : `${chars.slice(0, max).join('')}…`
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function appUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100').replace(/\/$/, '')
  return `${base}${path}`
}

export const LEVEL_LABEL: Record<'beginner' | 'intermediate' | 'advanced', string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
}

export const ROLE_LABEL: Record<'student' | 'instructor' | 'admin', string> = {
  student: '受講生',
  instructor: '講師',
  admin: '管理者',
}

export const REACTIONS = [
  { kind: 'clap', emoji: '👏', label: '拍手' },
  { kind: 'idea', emoji: '💡', label: 'なるほど' },
  { kind: 'thanks', emoji: '🙏', label: 'ありがとう' },
  { kind: 'fire', emoji: '🔥', label: '熱い' },
] as const
export type ReactionKind = (typeof REACTIONS)[number]['kind']
