import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, BarChart3, Calendar, FileText, Lightbulb, Search, Sparkles, Video } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { Logo } from '@/components/layout/logo'
import { LinkButton } from '@/components/ui/link-button'

const FLOW = [
  { icon: Search, title: '市場調査', description: 'AIが検索計画を立て、Webから根拠を集めます。' },
  { icon: BarChart3, title: '競合・顧客分析', description: '競合の発信と顧客の悩みを整理します。' },
  { icon: Lightbulb, title: '企画立案', description: '調査を根拠にした企画を、スコア付きで提案します。' },
  { icon: FileText, title: '台本作成', description: 'シーン単位の台本と撮影指示に落とし込みます。' },
  { icon: Video, title: '生成AIプロンプト', description: '動画生成サービスへ貼れるプロンプトを作ります。' },
  { icon: Calendar, title: 'カレンダー', description: '投稿予定として蓄積し、社内で共有します。' },
]

export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <div className="surface-glow min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <LinkButton href="/login" variant="ghost" size="sm">
            ログイン
          </LinkButton>
          <LinkButton href="/signup" size="sm">
            無料で始める
          </LinkButton>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-wash px-3 py-1 text-[12px] font-bold text-brand">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI Research &amp; Creative Intelligence
            </span>
            <h1 className="display mt-5 text-[34px] text-navy sm:text-[46px] lg:text-[54px]">
              動画を作る前に、
              <br />
              <span className="gradient-text">何を発信するか</span>をAIと決める。
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted">
              企業SNSの企画業務を、もっと速く、もっと戦略的に。市場調査・競合分析・企画立案・台本作成・撮影指示・動画生成AI用プロンプトまでを、ひとつのワークスペースで進められます。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/signup" variant="gradient" size="lg">
                無料で始める
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/login" variant="secondary" size="lg">
                ログイン
              </LinkButton>
            </div>
            <p className="mt-4 text-[12px] text-ink-subtle">
              ※ 本サービスは動画の生成・SNSへの自動投稿は行いません。企画と台本、生成AI用プロンプトの作成までを支援します。
            </p>
          </div>

          <div className="animate-fade-up rounded-[20px] border border-line bg-surface p-6 shadow-[0_16px_44px_rgba(15,39,80,0.1)]">
            <p className="text-[11px] font-bold tracking-[0.16em] text-ink-subtle">RESEARCH INTELLIGENCE</p>
            <div className="mt-4 space-y-3">
              {[
                { label: '市場動向', value: 88, tone: 'from-[#135dff] to-[#39c6ff]' },
                { label: '顧客インサイト', value: 76, tone: 'from-[#135dff] to-[#248cff]' },
                { label: '競合の空白領域', value: 64, tone: 'from-[#248cff] to-[#39c6ff]' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-navy">{item.label}</span>
                    <span className="tabular text-[13px] text-ink-muted">{item.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas-alt">
                    <div className={`h-full rounded-full bg-gradient-to-r ${item.tone}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
              {['FAQ', 'HowTo', '比較', '事例', 'Before / After', '失敗例'].map((theme) => (
                <span key={theme} className="rounded-[10px] bg-canvas-alt px-3 py-2 text-[12px] font-semibold text-navy">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line pt-12">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-navy">調査から台本まで、一気通貫で。</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FLOW.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-[18px] border border-line bg-surface p-5 shadow-[0_8px_30px_rgba(15,39,80,0.06)]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-wash text-brand">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-bold text-navy">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{item.description}</p>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-[12px] text-ink-muted sm:px-8">
          <Logo showText={false} />
          <p>SNS COMPASS — 企業SNS企画・市場調査AI</p>
          <Link href="/login" className="font-semibold text-brand hover:underline">
            ログイン
          </Link>
        </div>
      </footer>
    </div>
  )
}
