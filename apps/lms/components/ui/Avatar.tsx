import Image from 'next/image'
import { cn, initials } from '@/lib/utils'

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-300 bg-paper-200 font-serif text-ink-700',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-label={name}
    >
      {src ? (
        <Image src={src} alt="" width={size} height={size} className="size-full object-cover" style={{ filter: 'saturate(0.7)' }} />
      ) : (
        initials(name)
      )}
    </span>
  )
}
