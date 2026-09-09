import { ProgressBar } from '@/components/ui/ProgressBar'
import { xpToLevel } from '@/lib/xp'
import { cn } from '@/lib/utils'

/** レベル + 次のレベルまでの進捗（GAME-01）。ダッシュボードのあいさつ下などに置く想定 */
export function XpBadge({ totalXp, className }: { totalXp: number; className?: string }) {
  const lv = xpToLevel(totalXp)
  const remaining = Math.max(0, lv.next - totalXp)
  return (
    <div className={cn('max-w-xs', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="ui-label tnum text-ink-900">Lv.{lv.level}</span>
        <span className="caption tnum">{totalXp.toLocaleString('ja-JP')} XP</span>
      </div>
      <ProgressBar value={lv.progress * 100} label="次のレベルまで" showValue={false} className="mt-2" />
      <p className="caption tnum mt-1">次のレベルまで {remaining.toLocaleString('ja-JP')} XP</p>
    </div>
  )
}
