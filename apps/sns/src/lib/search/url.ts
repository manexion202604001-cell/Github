/**
 * URL の検証(要件67)。
 * http / https のみ許可し、localhost・プライベートネットワーク宛を拒否する(SSRF対策)。
 */
const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '127.0.0.1', '::1', 'metadata.google.internal'])

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string }

export function checkPublicUrl(raw: string): UrlCheck {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, reason: 'URLの形式が正しくありません' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'http / https のURLのみ利用できます' }
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    return { ok: false, reason: '内部ネットワークのURLは指定できません' }
  }
  if (isPrivateAddress(hostname)) {
    return { ok: false, reason: 'プライベートIPアドレスのURLは指定できません' }
  }

  return { ok: true, url }
}

/** IPv4 / IPv6 のプライベート・ループバック・リンクローカル判定。 */
export function isPrivateAddress(hostname: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)
  if (ipv4) {
    const octets = ipv4.slice(1, 5).map((part) => Number.parseInt(part, 10))
    if (octets.some((octet) => !Number.isFinite(octet) || octet < 0 || octet > 255)) return true
    const [a = 0, b = 0] = octets
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }

  if (hostname.includes(':')) {
    const lower = hostname.toLowerCase()
    if (lower === '::' || lower === '::1') return true
    // fc00::/7(ユニークローカル)、fe80::/10(リンクローカル)
    if (/^f[cd]/.test(lower) || /^fe[89ab]/.test(lower)) return true
  }

  return false
}

export function domainOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '')
  } catch {
    return raw.slice(0, 64)
  }
}
