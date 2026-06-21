import { cn } from '@/lib/utils'

export function BrowserFrame({
  title,
  decorative = false,
  className,
  children,
}: {
  title: string
  decorative?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={decorative || undefined}
      inert={decorative || undefined}
      className={cn(
        'overflow-hidden rounded-lg border border-zinc-200 bg-white/50 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50',
        className,
      )}
    >
      <div className='flex items-center gap-3 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800'>
        <div className='flex gap-1.5'>
          <span className='size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700' />
          <span className='size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700' />
          <span className='size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700' />
        </div>
        <span className='font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400'>
          {title}
        </span>
      </div>
      <div className='p-4 sm:p-6'>{children}</div>
    </div>
  )
}
