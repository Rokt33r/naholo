import { cn } from '@/lib/utils'

export function Section({
  className,
  innerClassName,
  children,
}: {
  className?: string
  innerClassName?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'relative border-b border-zinc-200 dark:border-zinc-800',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto w-full max-w-6xl px-6 py-20 sm:py-28',
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}
