import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-sans text-[14px] tracking-[0.06em] no-underline transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
  {
    variants: {
      variant: {
        primary: 'bg-ink-900 text-paper-100 hover:bg-ink-600 hover:text-paper-100',
        accent: 'bg-bronze-500 text-ink-900 hover:bg-bronze-400 hover:text-ink-900',
        outline: 'border border-ink-700 bg-transparent text-ink-700 hover:bg-paper-200 hover:text-ink-700',
        ghost: 'bg-transparent text-ink-700 hover:text-bronze-500',
        danger: 'border border-state-danger bg-transparent text-state-danger hover:bg-paper-200',
      },
      size: {
        md: 'h-11 px-6',
        sm: 'h-9 px-4 text-[13px]',
        icon: 'size-9 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...(asChild ? {} : { type: type ?? 'button' })}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
