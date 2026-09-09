import { describe, expect, it } from 'vitest'
import {
  buildCertificateText,
  certificateFileName,
  certificateStoragePath,
  formatCertificateDateEn,
  formatCertificateDateJa,
} from '@/lib/certificate-layout'

describe('certificate-layout', () => {
  it('日付は JST で整形される', () => {
    // UTC 23:30 は JST 翌日
    expect(formatCertificateDateJa('2026-09-08T23:30:00Z')).toBe('2026年9月9日')
    expect(formatCertificateDateEn('2026-09-08T23:30:00Z')).toBe('September 9, 2026')
  })

  it('保存パスとファイル名', () => {
    expect(certificateStoragePath('u1', 'c1')).toBe('u1/c1.pdf')
    expect(certificateFileName('SN-2026-7F3K9Q')).toBe('certificate-SN-2026-7F3K9Q.pdf')
    expect(certificateFileName('../x')).toBe('certificate-x.pdf')
  })

  it('日本語 / 英字のみの文面', () => {
    const base = {
      recipientName: '山田 太郎',
      courseTitle: 'n8n 入門',
      issuedAt: '2026-09-09T00:00:00+09:00',
      verifyCode: 'SN-2026-7F3K9Q',
      verifyUrl: 'https://example.com/verify/SN-2026-7F3K9Q',
    }
    const ja = buildCertificateText({ ...base, japanese: true })
    expect(ja.title).toBe('修了証')
    expect(ja.recipient).toBe('山田 太郎 殿')
    expect(ja.dateLine).toBe('発行日 2026年9月9日')
    expect(ja.codeLine).toContain('SN-2026-7F3K9Q')

    const en = buildCertificateText({ ...base, japanese: false })
    expect(en.title).toBe('Certificate of Completion')
    expect(en.recipient).toBe('山田 太郎')
    expect(en.dateLine).toBe('Issued on September 9, 2026')
    expect(en.verifyLine).toBe(base.verifyUrl)
  })
})
