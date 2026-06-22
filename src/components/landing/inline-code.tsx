export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
      {children}
    </code>
  )
}
