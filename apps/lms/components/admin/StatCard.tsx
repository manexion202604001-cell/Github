import { Card } from '@/components/ui/Card'

/** ADM-11: ダッシュボードの数値カード */
export function StatCard({ label, value, unit, note }: { label: string; value: number | string; unit?: string; note?: string }) {
  return (
    <Card className="p-5 md:p-6">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-3 font-serif text-[32px] leading-none text-ink-900">
        {value}
        {unit && <span className="ml-1 text-[14px] text-stone-500">{unit}</span>}
      </p>
      {note && <p className="caption mt-2">{note}</p>}
    </Card>
  )
}
