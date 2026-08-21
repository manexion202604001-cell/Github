/**
 * 依存ライブラリなしの軽量HTML抽出ヘルパ。
 * 完全なパーサではなく、必要な断片を取り出すことに特化している。
 */
export function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

export function firstMatch(html: string, pattern: RegExp): string | null {
  const match = pattern.exec(html)
  return match?.[1] ?? null
}

export function allMatches(html: string, pattern: RegExp): string[] {
  const results: string[] = []
  const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  let match = global.exec(html)
  while (match !== null) {
    if (match[1] !== undefined) results.push(match[1])
    match = global.exec(html)
  }
  return results
}

/** "￥1,980" / "1,980円" / "$29.99" などから数値を取り出す。 */
export function parsePrice(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const normalized = decodeEntities(value).replace(/[^\d.,]/g, '')
  if (!normalized) return undefined
  const cleaned = normalized.replace(/,/g, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined
}

export function parseNumber(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const cleaned = decodeEntities(value).replace(/[^\d.]/g, '')
  if (!cleaned) return undefined
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}
