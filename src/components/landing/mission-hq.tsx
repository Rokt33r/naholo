import Image from 'next/image'
import { cn } from '@/lib/utils'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Beat = {
  title: string
  body: string
  image: { src: string; alt: string; width: number; height: number }
}

const BEATS: Beat[] = [
  {
    title: 'Operations as issues',
    body: 'The OP is the unit of work — the cycle revolves around it. Drop context as logs (comments) and freeform notes (markdown) onto each operation; the CLI infils both into the local working dir when you start work.',
    image: {
      src: '/operation.png',
      alt: 'OP detail page with logs and notes',
      width: 1024,
      height: 926,
    },
  },
  {
    title: 'Per-OP usage stats',
    body: 'Tokens spent, model breakdown, and session timing are all recorded to the OP on exfil. Review the usage and run the next op more efficiently.',
    image: {
      src: '/stats.png',
      alt: 'Per-OP stats panel',
      width: 1132,
      height: 1150,
    },
  },
]

type IncomingItem = {
  title: string
  body: string
}

const INCOMING: IncomingItem[] = [
  {
    title: 'Campaigns & Kanban',
    body: 'Campaigns roll ops into epics; watch them flow across a Kanban board.',
  },
  {
    title: 'Token usage dashboard',
    body: 'Per-op stats roll up into a project dashboard that breaks spend down by operator across the day, week, or month.',
  },
  {
    title: 'Corps',
    body: 'A Corps groups projects and teams under one command, with bulk member control, shared settings, and a cross-project view.',
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
        The web app is an issue tracker for your codebase: operations are the
        issues, logs are the comments, and notes are markdown scratchpads.
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
            <div
              className={cn(
                'aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800',
                i % 2 === 1 && 'md:order-1',
              )}
            >
              <Image
                src={beat.image.src}
                alt={beat.image.alt}
                width={beat.image.width}
                height={beat.image.height}
                loading='eager'
                className='block h-auto w-full'
              />
            </div>
          </div>
        ))}

        <div className='pt-12 dark:border-zinc-800'>
          <span className='inline-block rounded border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-600 dark:border-amber-400/40 dark:text-amber-500'>
            [ INCOMING ]
          </span>
          <ul className='mt-6 max-w space-y-4 text-base leading-7 text-zinc-600 dark:text-zinc-300'>
            {INCOMING.map((item) => (
              <li key={item.title} className='flex items-start gap-3'>
                <span className='mt-2 h-1 w-1 flex-none rounded-full bg-emerald-500 dark:bg-emerald-400' />
                <span>
                  <strong className='font-semibold text-zinc-900 dark:text-zinc-50'>
                    {item.title}
                  </strong>
                  {' — '}
                  {item.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
