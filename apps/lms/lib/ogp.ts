import { unstable_cache } from 'next/cache'

export type Ogp = {
  url: string
  title: string
  description: string | null
  image: string | null
  siteName: string | null
}

/** 本文中の最初の http(s) URL（COM-02 OGP プレビュー対象） */
export function firstUrl(text: string): string | null {
  const m = /https?:\/\/[^\s<>()"'）」』]+/u.exec(text)
  return m?.[0] ?? null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
}

/** `<meta property="og:xxx" content="...">`（属性順不同）を正規表現で抽出する */
function metaContent(html: string, property: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const prop = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
    if (!prop || prop.toLowerCase() !== property) continue
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]
    if (content != null && content.trim()) return decodeEntities(content)
  }
  return null
}

/** HTML から OGP を抽出する（純粋関数） */
export function parseOgp(html: string, url = ''): Ogp | null {
  const head = html.slice(0, 200_000)
  const title = metaContent(head, 'og:title') ?? decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1] ?? '')
  if (!title) return null
  const image = metaContent(head, 'og:image') ?? metaContent(head, 'og:image:url')
  const resolved = image ? resolveUrl(image, url) : null
  return {
    url,
    title,
    description: metaContent(head, 'og:description') ?? metaContent(head, 'description'),
    image: resolved && /^https?:\/\//.test(resolved) ? resolved : null,
    siteName: metaContent(head, 'og:site_name'),
  }
}

function resolveUrl(candidate: string, base: string): string | null {
  try {
    return base ? new URL(candidate, base).toString() : new URL(candidate).toString()
  } catch {
    return null
  }
}

/** private / loopback / link-local を拒否する（SSRF 対策） */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a = 0, b = 0] = h.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }
  if (h.includes(':')) {
    if (h === '::1' || h === '::') return true
    if (/^f[cd]/.test(h) || h.startsWith('fe80')) return true
    if (h.startsWith('::ffff:')) return isPrivateHost(h.slice(7))
    return false
  }
  return false
}

async function fetchOgpUncached(url: string): Promise<Ogp | null> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (isPrivateHost(parsed.hostname)) return null
  try {
    const { lookup } = await import('node:dns/promises')
    const addrs = await lookup(parsed.hostname, { all: true })
    if (addrs.some((a) => isPrivateHost(a.address))) return null
  } catch {
    return null
  }
  try {
    const res = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(3000),
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; studio-n-lms/1.0; +ogp)', accept: 'text/html,application/xhtml+xml' },
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml/i.test(type)) return null
    const html = (await res.text()).slice(0, 300_000)
    return parseOgp(html, res.url || parsed.toString())
  } catch {
    return null
  }
}

/** OGP を取得する（1 時間キャッシュ。失敗時は null） */
export const fetchOgp = unstable_cache(fetchOgpUncached, ['ogp-preview'], { revalidate: 3600 })
