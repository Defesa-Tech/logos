/* Button Component primitives - A component that displays a button - from shadcn/ui (exposes Button, buttonVariants) */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-amber-400/30',
        gold: 'bg-gradient-to-r from-[#D4AF37] via-[#E5C358] to-[#C49E2C] text-[#19242E] font-semibold shadow-md shadow-[#D4AF37]/25 hover:shadow-lg hover:shadow-[#D4AF37]/40 hover:-translate-y-0.5 active:translate-y-0 border border-amber-300/40',
        sacred:
          'bg-gradient-to-r from-[#202E3B] to-[#2C3E50] text-white shadow-md shadow-slate-900/15 hover:shadow-lg hover:shadow-slate-900/25 hover:-translate-y-0.5 border border-white/10 hover:border-amber-400/30',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md hover:-translate-y-0.5',
        outline:
          'border border-slate-200 bg-white/80 backdrop-blur-sm text-foreground hover:bg-slate-50 hover:border-amber-300/60 hover:text-slate-900 hover:shadow-sm hover:-translate-y-0.5',
        secondary:
          'bg-slate-100 text-slate-800 hover:bg-slate-200/90 hover:shadow-sm hover:-translate-y-0.5',
        ghost: 'text-foreground hover:bg-slate-100/80 hover:text-slate-900 rounded-xl',
        link: 'text-foreground underline-offset-4 hover:underline hover:text-[#D4AF37]',
      },
      size: {
        default: 'h-10 px-4 py-2 rounded-xl',
        sm: 'h-8.5 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-7 text-sm font-semibold',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
