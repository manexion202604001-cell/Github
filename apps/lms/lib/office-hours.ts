/** OH-05: 参加ボタンが有効な時間幅（開催時刻の前後 3 時間）。純粋関数 */
export const ATTEND_WINDOW_MS = 3 * 60 * 60 * 1000

export function canMarkAttendance(scheduledAt: Date, now: Date = new Date()): boolean {
  return Math.abs(scheduledAt.getTime() - now.getTime()) <= ATTEND_WINDOW_MS
}

/** 開催終了（scheduled_at + duration）を過ぎているか */
export function isOfficeHourEnded(scheduledAt: Date, durationMin: number, now: Date = new Date()): boolean {
  return scheduledAt.getTime() + durationMin * 60_000 < now.getTime()
}
