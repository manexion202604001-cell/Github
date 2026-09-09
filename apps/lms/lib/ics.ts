/**
 * OH-01: カレンダー用 ICS（RFC 5545）を生成する純粋関数。
 * UTC 表記・CRLF 改行・テキストのエスケープ・75 バイト折り返しに対応。
 */
export type IcsInput = {
  uid: string
  title: string
  description?: string | null
  start: Date
  durationMin: number
  url?: string | null
  /** DTSTAMP に使う。省略時は現在時刻 */
  now?: Date
}

/** `20260909T110000Z` 形式（UTC） */
export function toIcsUtc(d: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

/** RFC 5545 3.3.11 のテキストエスケープ（\ ; , 改行） */
export function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

/** 75 オクテット（UTF-8）で折り返す（継続行は先頭に空白） */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of Array.from(line)) {
    const len = encoder.encode(ch).length
    const limit = out.length === 0 ? 75 : 74
    if (bytes + len > limit) {
      out.push(current)
      current = ch
      bytes = len
    } else {
      current += ch
      bytes += len
    }
  }
  out.push(current)
  return out.map((s, i) => (i === 0 ? s : ` ${s}`)).join('\r\n')
}

export function buildIcs(input: IcsInput): string {
  const start = input.start
  const end = new Date(start.getTime() + Math.max(0, input.durationMin) * 60_000)
  const now = input.now ?? new Date()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//studio N//LMS//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(input.uid)}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ]
  if (input.description) lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`)
  if (input.url) {
    lines.push(`URL:${input.url}`)
    lines.push(`LOCATION:${escapeIcsText(input.url)}`)
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}
