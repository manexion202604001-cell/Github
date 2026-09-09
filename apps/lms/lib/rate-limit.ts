import 'server-only'

/**
 * 投稿系のレート制限（1 分 10 回、REQUIREMENTS §11）。
 * 単一インスタンス前提のインメモリ実装（月間 100 人規模）。
 */
const buckets = new Map<string, number[]>()

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k)
  }
  return true
}
