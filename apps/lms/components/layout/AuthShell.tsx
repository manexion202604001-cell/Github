import Link from 'next/link'

export function AuthShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="dark-surface hidden flex-col justify-between bg-ink-900 p-12 text-paper-100 lg:flex">
        <Link href="/" className="font-serif text-[18px] tracking-widest text-paper-100 no-underline hover:text-paper-100">studio N</Link>
        <p className="max-w-[18ch] font-serif text-[28px] leading-[1.5]">静かに、深く、学び合う。</p>
        <p className="caption text-stone-400">Learning Community</p>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <Link href="/" className="mb-10 block font-serif tracking-widest text-ink-900 no-underline lg:hidden">studio N</Link>
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h1 className="mb-8 text-[28px]">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
