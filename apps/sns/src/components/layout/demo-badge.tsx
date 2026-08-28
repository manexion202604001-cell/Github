import { Sparkles } from 'lucide-react'

/**
 * Demo Mode バッジ(要件99)。
 * AI・検索のどちらかがサンプル動作の場合に表示し、本番設定では出さない。
 */
export function DemoBadge({ ai, search }: { ai: boolean; search: boolean }) {
  if (!ai && !search) return null
  const parts = [ai ? 'AI' : null, search ? '検索' : null].filter(Boolean).join('・')

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/20 px-2.5 py-1 text-[11px] font-bold text-[#7a5a00]"
      title={`${parts}のAPIキーが未設定のため、サンプルデータで動作しています`}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      Demo Mode
      <span className="font-semibold opacity-80">({parts})</span>
    </span>
  )
}
