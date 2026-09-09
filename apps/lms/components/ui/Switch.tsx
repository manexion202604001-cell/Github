'use client'
import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 items-center rounded border border-stone-400 bg-paper-200 transition-colors data-[state=checked]:border-bronze-500 data-[state=checked]:bg-bronze-500 disabled:opacity-40',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-3.5 translate-x-0.5 rounded bg-ink-900 transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-ink-900" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

export { Switch }
