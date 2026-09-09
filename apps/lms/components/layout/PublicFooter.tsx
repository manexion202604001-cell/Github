import Link from 'next/link'

export function PublicFooter() {
  return (
    <footer className="dark-surface bg-ink-900 px-6 py-12 text-paper-100">
      <div className="mx-auto flex max-w-container flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p className="font-serif tracking-widest">studio N</p>
        <nav className="flex gap-6 font-sans text-[12px] tracking-wider text-paper-100/70" aria-label="フッター">
          <Link href="/faq" className="text-paper-100/70 no-underline hover:text-bronze-400">FAQ</Link>
          <Link href="/terms" className="text-paper-100/70 no-underline hover:text-bronze-400">利用規約</Link>
          <Link href="/privacy" className="text-paper-100/70 no-underline hover:text-bronze-400">プライバシーポリシー</Link>
          <Link href="/login" className="text-paper-100/70 no-underline hover:text-bronze-400">ログイン</Link>
        </nav>
      </div>
    </footer>
  )
}
