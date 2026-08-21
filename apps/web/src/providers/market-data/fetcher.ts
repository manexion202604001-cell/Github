import { fetchRobots, isAllowedByRules } from './robots'

/**
 * ホスト単位のレート制限つきフェッチャ。
 * - 同一ホストへの同時アクセスは1本
 * - 最小間隔を必ず空ける(robots.txt の Crawl-delay があればそれを優先)
 * - 取得結果は TTL 付きでキャッシュし、同じページを何度も叩かない
 */
type Options = {
  userAgent: string
  minIntervalMs: number
  respectRobots: boolean
  cacheTtlMs?: number
}

export type FetchOutcome =
  | { ok: true; html: string; fromCache: boolean }
  | { ok: false; reason: 'ROBOTS_DISALLOWED' | 'HTTP_ERROR' | 'NETWORK'; message: string }

const queues = new Map<string, Promise<unknown>>()
const lastRequestAt = new Map<string, number>()
const pageCache = new Map<string, { html: string; fetchedAt: number }>()

export class PoliteFetcher {
  constructor(private readonly options: Options) {}

  async get(url: string): Promise<FetchOutcome> {
    const parsed = new URL(url)
    const ttl = this.options.cacheTtlMs ?? 24 * 60 * 60 * 1000

    const cached = pageCache.get(url)
    if (cached && Date.now() - cached.fetchedAt < ttl) {
      return { ok: true, html: cached.html, fromCache: true }
    }

    if (this.options.respectRobots) {
      const rules = await fetchRobots(parsed.origin, this.options.userAgent)
      if (!isAllowedByRules(rules, parsed.pathname)) {
        return {
          ok: false,
          reason: 'ROBOTS_DISALLOWED',
          message: `robots.txt により ${parsed.pathname} の取得が許可されていません`,
        }
      }
    }

    return this.enqueue(parsed.host, async () => {
      await this.throttle(parsed.host)
      try {
        const response = await fetch(url, {
          headers: {
            'user-agent': this.options.userAgent,
            'accept-language': 'ja,en;q=0.8',
            accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(20_000),
        })
        if (!response.ok) {
          return { ok: false as const, reason: 'HTTP_ERROR' as const, message: `HTTP ${response.status}` }
        }
        const html = await response.text()
        pageCache.set(url, { html, fetchedAt: Date.now() })
        return { ok: true as const, html, fromCache: false }
      } catch (error) {
        return {
          ok: false as const,
          reason: 'NETWORK' as const,
          message: error instanceof Error ? error.message : String(error),
        }
      }
    })
  }

  private async throttle(host: string): Promise<void> {
    const last = lastRequestAt.get(host) ?? 0
    const wait = last + this.options.minIntervalMs - Date.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    lastRequestAt.set(host, Date.now())
  }

  /** ホストごとに直列化する。 */
  private async enqueue<T>(host: string, task: () => Promise<T>): Promise<T> {
    const previous = queues.get(host) ?? Promise.resolve()
    const next = previous.then(task, task)
    queues.set(
      host,
      next.catch(() => undefined),
    )
    return next
  }
}
