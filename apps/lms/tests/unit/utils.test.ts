import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatRelative, initials, slugify, toJstDateString } from '@/lib/utils'

describe('formatDate', () => {
  it('JST で 年月日（曜） 形式', () => {
    expect(formatDate('2026-09-09T00:00:00+09:00')).toBe('2026年9月9日（水）')
    // UTC 23:30 は JST 翌日
    expect(formatDate('2026-09-08T23:30:00Z')).toBe('2026年9月9日（水）')
    expect(formatDate(null)).toBe('')
  })
  it('時刻付き', () => {
    expect(formatDateTime('2026-09-09T20:00:00+09:00')).toBe('2026年9月9日（水） 20:00')
  })
  it('toJstDateString', () => {
    expect(toJstDateString('2026-09-08T16:00:00Z')).toBe('2026-09-09')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-09-09T12:00:00Z')
  it('相対表記', () => {
    expect(formatRelative('2026-09-09T11:59:40Z', now)).toBe('たった今')
    expect(formatRelative('2026-09-09T11:30:00Z', now)).toBe('30分前')
    expect(formatRelative('2026-09-09T09:00:00Z', now)).toBe('3時間前')
    expect(formatRelative('2026-09-07T12:00:00Z', now)).toBe('2日前')
  })
})

describe('misc', () => {
  it('initials', () => {
    expect(initials('山田 太郎')).toBe('山')
    expect(initials('')).toBe('?')
  })
  it('slugify', () => {
    expect(slugify('n8n で業務自動化 入門')).toBe('n8n-で業務自動化-入門')
    expect(slugify('  Hello World! ')).toBe('hello-world')
  })
})
