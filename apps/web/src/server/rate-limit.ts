import 'server-only'

type Bucket = { count: number; resetAt: number }

/**
 * プロセス内のシンプルなレート制限(要件109)。
 * 複数インスタンス構成では Redis 等の共有ストアへ差し替える前提のポート。
 */
const buckets = new Map<string, Bucket>()

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  bucket.count += 1
  const allowed = bucket.count <= limit
  return { allowed, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt }
}

/** 古いバケットを掃除する(メモリリーク防止)。 */
export function pruneRateLimits(now = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}
