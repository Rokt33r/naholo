export function UnderConstruction() {
  return (
    <div className='not-prose my-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3'>
      <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
        // Under construction
      </p>
      <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>
        This chapter is still being rewritten.
      </p>
    </div>
  )
}
