import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'

const FLOW = [
  '商品概要入力',
  'AI商品画像',
  '360度ビュー',
  '市場・競合分析',
  'AIスコアリング',
  '利益シミュレーション',
  '商品仕様',
  'OEM仕様書',
  'LP生成',
  'PR動画',
  '販売分析',
  '次回ロット改善',
]

const FEATURES = [
  {
    title: '「作りたい」から始まる',
    body: '高度な市場分析の知識は不要です。「こんな商品を作りたい」と入力するだけで、AIが不足情報を質問しながら商品企画を完成させます。',
  },
  {
    title: '売れるかどうかを、作る前に',
    body: '市場需要・競合強度・差別化余地・利益性など9項目を100点満点で評価し、GO / IMPROVE GO / NO GO を根拠つきで判定します。',
  },
  {
    title: '利益から逆算する',
    body: '販売価格と目標利益率を入れると、Amazon手数料・広告費・物流費を引いた最大許容製造原価を即座に算出。OEM交渉の基準になります。',
  },
  {
    title: 'アイデアから販売後まで一気通貫',
    body: '商品画像・OEM仕様書・LP・PR動画構成までAIが生成。販売後はレビューと売上データから次回ロットの改善案を提案します。',
  },
]

export default function MarketingPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              ログイン
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">無料で始める</Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 text-center sm:pt-24">
          <p className="text-[13px] font-bold tracking-widest text-brand">AI PRODUCT DEVELOPMENT OS</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl leading-tight font-bold sm:text-5xl">
            売れる商品を探すのではなく、
            <br className="hidden sm:block" />
            <span className="text-brand">売れる商品を作る。</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-8 text-ink-muted">
            商品アイデアの入力から、AI商品イメージ生成・市場調査・競合分析・利益シミュレーション・OEM仕様書・LP制作・PR動画・販売後改善までを、ひとつのプロジェクトで一気通貫に管理する商品開発プラットフォームです。
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg">プロジェクトを作成する</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                ログイン
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-y border-line bg-surface py-12">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-center text-[12px] font-bold tracking-widest text-ink-subtle">
              商品開発のすべての工程を統合
            </p>
            <ol className="mt-6 flex flex-wrap items-center justify-center gap-x-1 gap-y-3">
              {FLOW.map((step, index) => (
                <li key={step} className="flex items-center gap-1">
                  <span className="rounded-full border border-line bg-canvas px-3 py-1 text-[12px] font-semibold text-ink-muted">
                    {step}
                  </span>
                  {index < FLOW.length - 1 ? <span className="text-line-strong">→</span> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-[18px] border border-line bg-surface p-7">
                <h2 className="text-lg font-bold">{feature.title}</h2>
                <p className="mt-3 text-[14px] leading-7 text-ink-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 text-center">
          <div className="rounded-[18px] border border-line bg-surface px-6 py-14">
            <h2 className="text-2xl font-bold sm:text-3xl">次の商品を、今日から開発する</h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-7 text-ink-muted">
              APIキーの設定前でもサンプルデータで全工程を体験できます。
            </p>
            <div className="mt-7">
              <Link href="/signup">
                <Button size="lg">無料で始める</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-[12px] text-ink-subtle">
        © {new Date().getFullYear()} MANEXION Inc.
      </footer>
    </div>
  )
}
