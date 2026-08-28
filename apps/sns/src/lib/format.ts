export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('ja-JP').format(value)
}

export function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(date)
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** カレンダー・並び替え用の YYYY-MM-DD。ローカルタイムで切る。 */
export function toDateKey(value: Date | string): string {
  const date = toDate(value)
  if (!date) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function relativeTime(value: Date | string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  const diffMs = date.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const formatter = new Intl.RelativeTimeFormat('ja-JP', { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600_000],
    ['month', 30 * 24 * 3600_000],
    ['day', 24 * 3600_000],
    ['hour', 3600_000],
    ['minute', 60_000],
  ]
  for (const [unit, ms] of units) {
    if (abs >= ms) return formatter.format(Math.round(diffMs / ms), unit)
  }
  return formatter.format(Math.round(diffMs / 1000), 'second')
}

export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes}分` : `${minutes}分${rest}秒`
}

/** 秒数を 0:00 形式へ。台本のタイムラインで使う。 */
export function timecode(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? null : date
}
