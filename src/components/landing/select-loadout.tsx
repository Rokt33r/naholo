import { Users, UserRound } from 'lucide-react'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Loadout = {
  tag: string
  title: string
  blurb: string
  useCases: string[]
  Icon: React.ComponentType<{ className?: string }>
}

const LOADOUTS: Loadout[] = [
  {
    tag: 'SOLO',
    title: 'Solo Operator',
    blurb:
      'Run missions without committing config to the repo. Kit lives in your ruck (~/.naholo), not the project. Start with `naholo solo init` and go.',
    useCases: [
      'Your own side-project repo — no team config to commit.',
      'Multiple personal repos, each mapped to a different worker.',
      'Trying naholo on a codebase you don\u2019t control.',
    ],
    Icon: UserRound,
  },
  {
    tag: 'SQUAD',
    title: 'Squad',
    blurb:
      'Share project config across the team. Every operator works the same loop — briefings, tasks, and logs stay in sync across the squad.',
    useCases: [
      'Shared project config checked into the repo.',
      'Per-issue briefings and logs visible to the whole team.',
      'Bot operators dispatched alongside human reviewers.',
    ],
    Icon: Users,
  },
]

export function SelectLoadout() {
  return (
    <Section>
      <BriefingLabel>{'// 04 · Select loadout'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Solo operator or full squad.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Same loop, different kit. Pick the loadout that matches the op.
      </p>

      <div className='mt-12 grid grid-cols-1 gap-6 md:grid-cols-2'>
        {LOADOUTS.map((l) => (
          <article
            key={l.tag}
            className='flex flex-col rounded-lg border border-zinc-200 bg-white/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/50'
          >
            <div className='flex items-center gap-3'>
              <l.Icon className='h-5 w-5 text-amber-500 dark:text-amber-400' />
              <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
                {l.tag}
              </span>
            </div>
            <h3 className='mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
              {l.title}
            </h3>
            <p className='mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
              {l.blurb}
            </p>
            <ul className='mt-6 space-y-2 border-t border-zinc-200 pt-6 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300'>
              {l.useCases.map((uc) => (
                <li key={uc} className='flex items-start gap-2'>
                  <span className='mt-2 h-1 w-1 flex-none rounded-full bg-emerald-500 dark:bg-emerald-400' />
                  <span>{uc}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}
