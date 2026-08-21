/**
 * robots.txt の取得・解析・判定。
 * スクレイピングProviderは必ずここを通す(要件24の運用上の前提)。
 */
type RobotsRules = { disallow: string[]; allow: string[]; crawlDelayMs: number | null }

const cache = new Map<string, { rules: RobotsRules; fetchedAt: number }>()
const TTL_MS = 6 * 60 * 60 * 1000

export function parseRobots(text: string, userAgent: string): RobotsRules {
  const rules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null }
  const target = userAgent.toLowerCase()
  let applies = false
  let sawSpecific = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (key === 'user-agent') {
      const agent = value.toLowerCase()
      const isSpecific = agent !== '*' && target.includes(agent)
      if (isSpecific) {
        // 自分向けのグループが見つかったら、それまでの `*` ルールを捨てる。
        if (!sawSpecific) {
          rules.disallow = []
          rules.allow = []
          rules.crawlDelayMs = null
        }
        sawSpecific = true
        applies = true
      } else {
        applies = !sawSpecific && agent === '*'
      }
      continue
    }

    if (!applies) continue
    if (key === 'disallow' && value) rules.disallow.push(value)
    else if (key === 'allow' && value) rules.allow.push(value)
    else if (key === 'crawl-delay') {
      const seconds = Number.parseFloat(value)
      if (Number.isFinite(seconds)) rules.crawlDelayMs = Math.round(seconds * 1000)
    }
  }

  return rules
}

export function isAllowedByRules(rules: RobotsRules, path: string): boolean {
  const longest = (patterns: string[]): number =>
    patterns.reduce((best, pattern) => (path.startsWith(pattern) ? Math.max(best, pattern.length) : best), -1)

  const allow = longest(rules.allow)
  const disallow = longest(rules.disallow)
  if (disallow === -1) return true
  return allow >= disallow
}

export async function fetchRobots(origin: string, userAgent: string): Promise<RobotsRules> {
  const cached = cache.get(origin)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.rules

  let rules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null }
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': userAgent },
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) rules = parseRobots(await response.text(), userAgent)
  } catch {
    // robots.txt が取得できない場合は「全面禁止」ではなく既定ルール(空)を用いる。
    // 判断はレート制限と併せて呼び出し側のポリシーで行う。
  }

  cache.set(origin, { rules, fetchedAt: Date.now() })
  return rules
}
