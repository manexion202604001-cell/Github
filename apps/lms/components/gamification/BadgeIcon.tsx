import { Award, BadgeCheck, CalendarCheck, Compass, Crown, Feather, Footprints, Sunrise, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** badges.icon（lucide のアイコン名）→ 静的 import した map。未知は Award */
const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  award: Award,
  crown: Crown,
  compass: Compass,
  feather: Feather,
  'calendar-check': CalendarCheck,
  sunrise: Sunrise,
  'badge-check': BadgeCheck,
}

export function BadgeIcon({ icon, earned = true, className }: { icon: string | null; earned?: boolean; className?: string }) {
  const Icon = (icon && ICONS[icon]) || Award
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded border',
        earned ? 'border-bronze-500 text-bronze-500' : 'border-stone-300 text-stone-400',
        className,
      )}
    >
      <Icon className="size-5 stroke-[1.5]" />
    </span>
  )
}
