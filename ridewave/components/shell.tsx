import { cn } from '@/lib/utils'

export function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('container-padding mx-auto w-full max-w-6xl', className)}>
      {children}
    </div>
  )
}