export function OperateTerminalMockup() {
  return (
    <div
      aria-hidden='true'
      inert
      className='overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950'
    >
      {/* Title bar */}
      <div className='flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5'>
        <div className='flex gap-1.5'>
          <span className='size-2.5 rounded-full bg-zinc-700' />
          <span className='size-2.5 rounded-full bg-zinc-700' />
          <span className='size-2.5 rounded-full bg-zinc-700' />
        </div>
        <span className='font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-500'>
          claude code cli
        </span>
      </div>

      {/* Terminal body */}
      <div className='p-4 font-mono text-xs leading-relaxed text-zinc-300 sm:text-sm'>
        <div className='whitespace-pre-wrap break-words'>
          <div>
            <span className='text-amber-400'>❯</span>{' '}
            <span className='text-zinc-100'>/infil 222</span>
          </div>
          <div>{' '}</div>
          <div className='text-zinc-600'>...</div>
          <div>{' '}</div>
          <div>
            {'Infilled operation '}
            <span className='text-zinc-100'>#222</span>
            {': "Redact ai transcripts"'}
          </div>
          <div>
            {'  - Tasks: 0 (none yet — to be defined in '}
            <span className='text-zinc-100'>/warno</span>
            {')'}
          </div>
          <div>
            {'  - Notes: '}
            <span className='text-zinc-100'>OPERATION</span>
            {' [created], '}
            <span className='text-zinc-100'>transcript-schema</span>
          </div>
          <div>{'  - Logs: 2 entries'}</div>
          <div className='text-zinc-100'>
            {'  - Local: <project-dir>/.naholo/local/infilled/'}
          </div>
          <div>{'  - Operation: OPERATION.md'}</div>
          <div>{' '}</div>
          <div>
            {
              'Seeded ## SITUATION from the logs — the gist: full transcripts upload on exfil and can leak secrets, so strip every user and agent message and redact tool output down to the fields stats need. Folded transcript-schema in as reference.'
            }
          </div>
          <div>{' '}</div>
          <div>
            {'Next move: '}
            <span className='text-zinc-100'>/warno</span>
            {' to research the codebase and draft the WARNING ORDER.'}
          </div>
        </div>
      </div>

      {/* Prompt input (Claude Code CLI) */}
      <div className='px-4 pb-4'>
        <div className='flex items-center gap-2 border-y border-zinc-700 py-2 font-mono text-xs text-zinc-200 sm:text-sm'>
          <span className='text-amber-400'>❯</span>
          <span className='text-zinc-100'>
            {'/warno'}
            <span className='animate-caret-blink text-zinc-400'>▌</span>
          </span>
        </div>
      </div>
    </div>
  )
}
