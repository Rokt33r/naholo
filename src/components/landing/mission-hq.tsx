import { cn } from '@/lib/utils'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Beat = {
  title: string
  body: string
  caption: string
}

const BEATS: Beat[] = [
  {
    title: 'Operations as issues',
    body: 'The OP is the unit of work — the cycle revolves around it. Drop context as logs (comments) and freeform notes (markdown) onto each operation; the CLI infils both into the local working dir when you start work.',
    caption: 'OP detail page with logs and notes',
  },
  {
    title: 'Per-OP usage stats',
    body: 'Token spend, model breakdown, session timing — all scoped to the OP. Approve the next splash with the receipt in hand.',
    caption: 'Per-OP stats panel',
  },
]

export function MissionHQ() {
  return (
    <Section>
      <BriefingLabel>{'// 04 · Mission HQ'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Plan ops the way you plan issues.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        An issue tracker for your codebase ops. Operations are issues. Logs are
        comments. Notes are markdown scratchpads.
      </p>

      <div className='mt-12 space-y-12'>
        {BEATS.map((beat, i) => (
          <div
            key={beat.title}
            className='grid grid-cols-1 items-center gap-8 md:grid-cols-2'
          >
            <div className={cn(i % 2 === 1 && 'md:order-2')}>
              <h3 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
                {beat.title}
              </h3>
              <p className='mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300'>
                {beat.body}
              </p>
            </div>
            <div className={cn(i % 2 === 1 && 'md:order-1')}>
              <ScreenshotPlaceholder caption={beat.caption} />
            </div>
          </div>
        ))}

        <div className='border-t border-zinc-200 pt-12 dark:border-zinc-800'>
          <div className='flex items-center gap-3'>
            <h3 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
              Campaigns & Kanban
            </h3>
            <span className='rounded border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-600 dark:border-amber-400/40 dark:text-amber-500'>
              [ INCOMING ]
            </span>
          </div>
          <p className='mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
            Epics and board view in the next pass.
          </p>
        </div>
      </div>
    </Section>
  )
}

function ScreenshotPlaceholder({ caption }: { caption: string }) {
  return (
    <div
      className='flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30'
      role='img'
      aria-label={`Screenshot placeholder: ${caption}`}
    >
      <span className='text-center font-mono text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600'>
        [ Screenshot: {caption} ]
      </span>
    </div>
  )
}
