import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata = { title: 'studio N — 学びの場', description: 'studio N の既存顧客向け、招待制のコミュニティ型学習プラットフォーム。' }

export default function LandingPage() {
  return (
    <>
      <section className="dark-surface flex min-h-[70vh] flex-col justify-between bg-ink-900 px-6 py-10 text-paper-100 md:px-12">
        <div className="mx-auto flex w-full max-w-container items-center justify-between">
          <span className="font-serif text-[18px] tracking-widest">studio N</span>
          <Link href="/login" className="ui-label text-paper-100/70 no-underline hover:text-bronze-400">
            会員の方はログイン
          </Link>
        </div>
        <div className="mx-auto w-full max-w-container py-24 md:py-32">
          <p className="eyebrow mb-6 text-stone-300">Learning Community</p>
          <h1 className="max-w-[20ch] text-[32px] leading-[1.4] text-paper-100 md:text-[44px]">
            静かに、深く、学び合う。
          </h1>
          <p className="mt-8 max-w-prose text-[16px] leading-[1.9] text-paper-100/70">
            studio N の学習プラットフォームは、AI・n8n・開発を学ぶ既存のお客様のための招待制コミュニティです。
            動画とスライドで学び、講師に問い、仲間と語らう。学びに集中できる場を用意しました。
          </p>
          <div className="mt-12 flex gap-3">
            <Button variant="accent" asChild>
              <Link href="/login">ログイン</Link>
            </Button>
            <Button variant="ghost" className="text-paper-100/70 hover:text-bronze-400" asChild>
              <Link href="/faq">FAQ を見る</Link>
            </Button>
          </div>
        </div>
        <p className="mx-auto w-full max-w-container caption text-stone-400">ご登録は studio N からの招待が必要です。</p>
      </section>

      <section className="mx-auto max-w-container px-6 py-16 md:px-12 md:py-24">
        <div className="grid gap-12 md:grid-cols-3">
          {[
            { t: '学ぶ', d: '動画・スライド・テキストのレッスンを、続きから。進捗は常に一目で。' },
            { t: '問う', d: '講師が公式に答える Q&A。24 時間以内の一次回答を目指します。' },
            { t: '語らう', d: '受講生同士のコミュニティと、月に一度のオフィスアワー。' },
          ].map((x) => (
            <div key={x.t} className="border-t pt-6">
              <h2 className="text-[22px]">{x.t}</h2>
              <p className="mt-3 text-[15px] leading-[1.9] text-stone-500">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter />
    </>
  )
}
