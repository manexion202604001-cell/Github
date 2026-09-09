import Link from 'next/link'
import type { Metadata } from 'next'
import { isValidVerifyCode } from '@/lib/xp'
import { getCertificateByVerifyCode } from '@/lib/db/queries/gamification'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: '修了証の検証',
  description: 'studio N 学習プラットフォームが発行した修了証の真正性を検証します。',
  robots: { index: true, follow: true },
}

/** GAME-04 / §5.10: 修了証の真正性検証（ログイン不要） */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params
  const code = decodeURIComponent(raw).trim().toUpperCase()
  const cert = isValidVerifyCode(code) ? await getCertificateByVerifyCode(code) : null

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="dark-surface bg-ink-900 px-6 py-6 text-paper-100">
        <div className="mx-auto flex max-w-container items-center justify-between">
          <Link href="/" className="font-serif tracking-widest text-paper-100 no-underline hover:text-paper-100">studio N</Link>
          <Link href="/login" className="ui-label text-paper-100/70 no-underline hover:text-bronze-400">ログイン</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-prose flex-1 px-6 py-16 md:py-24">
        <p className="eyebrow mb-2">Certificate verification</p>
        <h1 className="mb-8">修了証の検証</h1>
        {cert ? (
          <div className="animate-fade-up rounded border bg-paper-200 p-6 md:p-8">
            <p className="caption">この修了証は studio N が発行した正規のものです。</p>
            <dl className="mt-6 grid gap-4">
              <div>
                <dt className="eyebrow">受講者</dt>
                <dd className="mt-1 font-serif text-[20px] text-ink-900">{cert.recipientName}</dd>
              </div>
              <div>
                <dt className="eyebrow">コース</dt>
                <dd className="mt-1 font-serif text-[18px] text-ink-900">{cert.courseTitle}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="eyebrow">発行日</dt>
                  <dd className="tnum mt-1 text-[15px]">{formatDate(cert.issuedAt)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">検証コード</dt>
                  <dd className="mt-1 font-mono text-[14px]">{cert.verifyCode}</dd>
                </div>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded border bg-paper-200 p-6 md:p-8">
            <p className="font-serif text-ink-700">この検証コードに該当する修了証はありません。</p>
            <p className="caption mt-3 font-mono">{code}</p>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
