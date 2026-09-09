import Link from 'next/link'
import { PublicFooter } from './PublicFooter'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <header className="dark-surface bg-ink-900 px-6 py-6 text-paper-100">
        <div className="mx-auto flex max-w-container items-center justify-between">
          <Link href="/" className="font-serif tracking-widest text-paper-100 no-underline hover:text-paper-100">studio N</Link>
          <Link href="/login" className="ui-label text-paper-100/70 no-underline hover:text-bronze-400">ログイン</Link>
        </div>
      </header>
      <main className="mx-auto max-w-prose px-6 py-16 md:py-24">
        <h1 className="mb-2">{title}</h1>
        <p className="caption mb-12">最終更新: {updated}</p>
        <div className="prose-n">{children}</div>
      </main>
      <PublicFooter />
    </>
  )
}
