import { describe, expect, it } from 'vitest'
import { applyMentionLinks, extractMentions } from '@/lib/mentions'

describe('extractMentions', () => {
  it('@表示名 を抽出する', () => {
    expect(extractMentions('@山田太郎 さん、ありがとうございます')).toEqual(['山田太郎'])
  })
  it('複数・重複・末尾句読点', () => {
    expect(extractMentions('@aki と @yuki、@aki も。')).toEqual(['aki', 'yuki'])
  })
  it('メールアドレスや連続 @ は無視する', () => {
    expect(extractMentions('mail: foo@example.com @@x')).toEqual([])
  })
  it('40 文字超は切り捨てず無視する', () => {
    expect(extractMentions(`@${'a'.repeat(41)}`)).toEqual([])
    expect(extractMentions(`@${'a'.repeat(40)}`)).toEqual(['a'.repeat(40)])
  })
  it('空文字', () => {
    expect(extractMentions('')).toEqual([])
  })
})

describe('applyMentionLinks', () => {
  it('既知の表示名のみリンク化する', () => {
    const out = applyMentionLinks('@aki と @unknown へ。', { aki: 'u1' })
    expect(out).toBe('[@aki](/members/u1) と @unknown へ。')
  })
  it('末尾の句読点はリンク外に残す', () => {
    expect(applyMentionLinks('@aki、こんにちは', { aki: 'u1' })).toBe('[@aki](/members/u1)、こんにちは')
  })
  it('マップが空なら変更しない', () => {
    expect(applyMentionLinks('@aki', {})).toBe('@aki')
  })
})
