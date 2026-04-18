import { cn } from '@/lib/utils'

export function BriefingLabel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'font-mono text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500',
        className,
      )}
    >
      {children}
    </div>
  )
}
