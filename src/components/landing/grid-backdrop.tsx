import { cn } from '@/lib/utils'

export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,theme(colors.zinc.300/30)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.zinc.300/30)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(to_right,theme(colors.zinc.700/40)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.zinc.700/40)_1px,transparent_1px)]',
        className,
      )}
    />
  )
}
