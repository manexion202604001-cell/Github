import { describe, expect, it } from 'vitest'
import { buildIcs, escapeIcsText, foldIcsLine, toIcsUtc } from '@/lib/ics'

describe('ics', () => {
  it('toIcsUtc は UTC 表記', () => {
    expect(toIcsUtc(new Date('2026-09-09T20:00:00+09:00'))).toBe('20260909T110000Z')
  })
  it('escapeIcsText', () => {
    expect(escapeIcsText('a;b,c\\d\nline')).toBe('a\\;b\\,c\\\\d\\nline')
  })
  it('foldIcsLine は 75 バイトで折り返す', () => {
    const long = 'X'.repeat(100)
    const folded = foldIcsLine(long)
    const lines = folded.split('\r\n')
    expect(lines[0]).toHaveLength(75)
    expect(lines[1]?.startsWith(' ')).toBe(true)
    expect(folded.replace(/\r\n /g, '')).toBe(long)
    // マルチバイトも文字境界で折る
    const jp = 'あ'.repeat(40)
    expect(foldIcsLine(jp).replace(/\r\n /g, '')).toBe(jp)
  })
  it('buildIcs は CRLF・UTC・エスケープ済み', () => {
    const ics = buildIcs({
      uid: 'oh-1@studio-n',
      title: '第1回; オフィスアワー',
      description: 'テーマ,\n質問歓迎',
      start: new Date('2026-09-09T20:00:00+09:00'),
      durationMin: 60,
      url: 'https://example.com/office-hours/1',
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(ics.includes('\n') && !ics.includes('\r\n')).toBe(false)
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true)
    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics).toContain('DTSTART:20260909T110000Z')
    expect(ics).toContain('DTEND:20260909T120000Z')
    expect(ics).toContain('DTSTAMP:20260901T000000Z')
    expect(ics).toContain('SUMMARY:第1回\\; オフィスアワー')
    expect(ics).toContain('DESCRIPTION:テーマ\\,\\n質問歓迎')
    expect(ics).toContain('URL:https://example.com/office-hours/1')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
  it('url / description 省略可', () => {
    const ics = buildIcs({ uid: 'u', title: 't', start: new Date('2026-01-01T00:00:00Z'), durationMin: 30 })
    expect(ics).not.toContain('URL:')
    expect(ics).not.toContain('DESCRIPTION:')
    expect(ics).toContain('DTEND:20260101T003000Z')
  })
})
