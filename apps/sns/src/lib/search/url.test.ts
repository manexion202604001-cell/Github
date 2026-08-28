import { describe, expect, it } from 'vitest'
import { checkPublicUrl, domainOf, isPrivateAddress } from './url'

describe('checkPublicUrl', () => {
  it('http / https の公開URLを許可する', () => {
    expect(checkPublicUrl('https://example.com/path').ok).toBe(true)
    expect(checkPublicUrl('http://example.co.jp').ok).toBe(true)
  })

  it('http / https 以外のスキームを拒否する(要件67)', () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com', 'javascript:alert(1)', 'data:text/html,x']) {
      expect(checkPublicUrl(url).ok).toBe(false)
    }
  })

  it('localhost と内部ホストを拒否する', () => {
    for (const url of ['http://localhost:3000', 'http://127.0.0.1', 'http://app.localhost', 'http://metadata.google.internal']) {
      expect(checkPublicUrl(url).ok).toBe(false)
    }
  })

  it('プライベートIP宛を拒否する(SSRF対策)', () => {
    for (const url of ['http://10.0.0.1', 'http://192.168.1.1', 'http://172.16.0.1', 'http://169.254.169.254']) {
      expect(checkPublicUrl(url).ok).toBe(false)
    }
  })

  it('URLとして解釈できない文字列を拒否する', () => {
    expect(checkPublicUrl('not a url').ok).toBe(false)
    expect(checkPublicUrl('').ok).toBe(false)
  })
})

describe('isPrivateAddress', () => {
  it('パブリックIPは許可する', () => {
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('203.0.113.10')).toBe(false)
  })

  it('IPv6のループバック・ユニークローカルを検出する', () => {
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('fd00::1')).toBe(true)
    expect(isPrivateAddress('fe80::1')).toBe(true)
  })
})

describe('domainOf', () => {
  it('www を除いたホスト名を返す', () => {
    expect(domainOf('https://www.example.com/a/b')).toBe('example.com')
  })

  it('解釈できない場合は入力の先頭を返す', () => {
    expect(domainOf('invalid')).toBe('invalid')
  })
})
