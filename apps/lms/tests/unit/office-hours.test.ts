import { describe, expect, it } from 'vitest'
import { canMarkAttendance, isOfficeHourEnded } from '@/lib/office-hours'

describe('office-hours', () => {
  const at = new Date('2026-09-09T11:00:00Z')
  it('canMarkAttendance は前後 3 時間のみ true', () => {
    expect(canMarkAttendance(at, new Date('2026-09-09T08:00:00Z'))).toBe(true)
    expect(canMarkAttendance(at, new Date('2026-09-09T14:00:00Z'))).toBe(true)
    expect(canMarkAttendance(at, new Date('2026-09-09T07:59:59Z'))).toBe(false)
    expect(canMarkAttendance(at, new Date('2026-09-09T14:00:01Z'))).toBe(false)
  })
  it('isOfficeHourEnded は開始 + 時間を過ぎたら true', () => {
    expect(isOfficeHourEnded(at, 60, new Date('2026-09-09T11:59:00Z'))).toBe(false)
    expect(isOfficeHourEnded(at, 60, new Date('2026-09-09T12:00:01Z'))).toBe(true)
  })
})
