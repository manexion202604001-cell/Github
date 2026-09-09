import { describe, expect, it } from 'vitest'
import { firstUrl, isPrivateHost, parseOgp } from '@/lib/ogp'

const html = `<!doctype html><html><head>
<title>Fallback &amp; Title</title>
<meta content="OG タイトル" property="og:title" />
<meta property='og:description' content='説明 &quot;引用&quot;'>
<meta property="og:image" content="/img/cover.png">
<meta name="og:site_name" content="Example Site">
</head><body><meta property="og:title" content="body"></body></html>`

describe('parseOgp', () => {
  it('og:* を属性順不同で抽出し、相対画像 URL を解決する', () => {
    const ogp = parseOgp(html, 'https://example.com/post/1')
    expect(ogp).toEqual({
      url: 'https://example.com/post/1',
      title: 'OG タイトル',
      description: '説明 "引用"',
      image: 'https://example.com/img/cover.png',
      siteName: 'Example Site',
    })
  })
  it('og:title が無ければ <title> にフォールバック', () => {
    const ogp = parseOgp('<html><head><title>Only &amp; Title</title></head></html>', 'https://a.example')
    expect(ogp?.title).toBe('Only & Title')
    expect(ogp?.image).toBeNull()
    expect(ogp?.description).toBeNull()
  })
  it('タイトルが無ければ null', () => {
    expect(parseOgp('<html><body>hi</body></html>')).toBeNull()
  })
  it('http(s) 以外の画像は捨てる', () => {
    expect(parseOgp('<meta property="og:title" content="t"><meta property="og:image" content="data:image/png;base64,xx">', 'https://a.example')?.image).toBeNull()
  })
})

describe('firstUrl', () => {
  it('最初の URL のみ', () => {
    expect(firstUrl('見て https://a.example/x?y=1 と http://b.example')).toBe('https://a.example/x?y=1')
    expect(firstUrl('（https://a.example/p）')).toBe('https://a.example/p')
    expect(firstUrl('URL なし')).toBeNull()
  })
})

describe('isPrivateHost', () => {
  it('private / loopback を拒否', () => {
    for (const h of ['localhost', '127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.0.1', '172.31.255.255', '169.254.1.1', '::1', 'fd00::1', '::ffff:10.0.0.1', 'app.internal']) {
      expect(isPrivateHost(h), h).toBe(true)
    }
  })
  it('public は許可', () => {
    for (const h of ['example.com', '8.8.8.8', '172.32.0.1', '2606:4700::1111']) expect(isPrivateHost(h), h).toBe(false)
  })
})
