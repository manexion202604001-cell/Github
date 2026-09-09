/**
 * YouTube の URL / ID 文字列から videoId（11 文字）を取り出す純粋関数。
 * 対応: youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /live/ID, /shorts/ID, youtube-nocookie.com, 生の ID
 */
const ID_RE = /^[A-Za-z0-9_-]{11}$/

export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null
  const raw = input.trim()
  if (ID_RE.test(raw)) return raw
  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\.|^m\./, '')
  const check = (id: string | null | undefined) => (id && ID_RE.test(id) ? id : null)
  if (host === 'youtu.be') return check(url.pathname.split('/')[1])
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v')
    if (v) return check(v)
    const seg = url.pathname.split('/').filter(Boolean)
    if (seg.length >= 2 && ['embed', 'live', 'shorts', 'v'].includes(seg[0] ?? '')) return check(seg[1])
  }
  return null
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
}
