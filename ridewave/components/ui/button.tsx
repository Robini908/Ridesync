"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900'
    const variants: Record<string, string> = {
      primary: 'bg-[--accent-blue] text-white hover:opacity-90',
      secondary: 'border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800',
      ghost: 'text-zinc-200 hover:bg-zinc-900'
    }
    return (
      <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
    )
  }
)
Button.displayName = 'Button'