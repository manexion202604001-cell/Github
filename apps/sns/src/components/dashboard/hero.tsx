import { ArrowRight, Sparkles } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'

/**
 * Dashboard Hero(要件113)。
 * 「今日、何をすべきか」を最初の一画面で伝える。
 */
export function DashboardHero({ userName, brandName, brandId }: { userName: string; brandName: string; brandId: string }) {
  const greeting = userName ? `${userName}さん、こんにちは。` : 'こんにちは。'

  return (
    <section className="grid-pattern overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className="grid gap-6 bg-gradient-to-br from-white via-white/85 to-transparent p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <p className="text-[12px] font-semibold text-ink-muted">{greeting}今日もSNS戦略を進めましょう。</p>
          <h1 className="display mt-3 text-[26px] text-navy sm:text-[32px]">
            市場を理解して、
            <br className="hidden sm:block" />
            次の投稿を決める。
          </h1>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-muted">
            調査・競合分析・企画・台本まで、ひとつのワークスペースで。いま選択中のブランドは
            <span className="font-semibold text-navy"> {brandName} </span>
            です。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href={`/research/new?brandId=${brandId}`} variant="gradient" size="lg">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              新しい市場調査
            </LinkButton>
            <LinkButton href={`/ideas?brandId=${brandId}`} variant="secondary" size="lg">
              企画を作成
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}

/** Research Intelligence を表す軽量なビジュアル。画像は使わない。 */
function HeroVisual() {
  const bars = [
    { label: 'Market', value: 82 },
    { label: 'Customer', value: 74 },
    { label: 'Competitor', value: 61 },
    { label: 'Content Gap', value: 48 },
  ]

  return (
    <div className="rounded-[16px] border border-line bg-surface/90 p-5 shadow-[0_8px_30px_rgba(15,39,80,0.06)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.14em] text-ink-subtle">RESEARCH SIGNALS</p>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-wash text-[#0a7ea8]">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-navy">{bar.label}</span>
              <span className="tabular text-[12px] text-ink-muted">{bar.value}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas-alt">
              <div className="gradient-brand h-full rounded-full" style={{ width: `${bar.value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-subtle">
        調査を実行すると、この指標は実際のレポート内容に置き換わります。
      </p>
    </div>
  )
}
