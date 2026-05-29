import { Gauge, LandPlot, RefreshCw, ScrollText, Workflow } from 'lucide-react'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Feature = {
  title: string
  bullets: string[]
  Icon: React.ComponentType<{ className?: string }>
}

const FEATURES: Feature[] = [
  {
    title: 'OP flow cycle',
    bullets: [
      'Military-style OP cycle — skills + CLI for AI agents, not vibe coding',
      'Plans and changes scoped for fast review',
      'Durable workflow — survives mid-session plan and implementation pivots',
    ],
    Icon: LandPlot,
  },
  {
    title: 'Stateless context',
    bullets: [
      'TIMELINE is auto-written as the OP proceeds, so every session opens with a compact recap',
      'No compact needed — start a fresh session anytime',
    ],
    Icon: ScrollText,
  },
  {
    title: 'Per-OP token usage',
    bullets: [
      'Automatic agent session tracking per OP',
      'Token spend tracked per OP — see where the budget goes',
      'Works across worktrees — concurrent sessions register to the right OP',
    ],
    Icon: Gauge,
  },
]

export function Features() {
  return (
    <Section>
      <BriefingLabel>{'// 02 · Features'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Built for developers, not vibe coders.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        A disciplined loop, a context that refuses to bloat, and a token bill
        you can actually read.
      </p>

      <div className='mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className='flex flex-col rounded-lg border border-zinc-200 bg-white/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/50'
          >
            <div className='flex items-center gap-3'>
              <f.Icon className='h-5 w-5 text-amber-500 dark:text-amber-400' />
              <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
                {f.title}
              </span>
            </div>
            <ul className='mt-6 space-y-2 border-t border-zinc-200 pt-6 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300'>
              {f.bullets.map((b) => (
                <li key={b} className='flex items-start gap-2'>
                  <span className='mt-2 h-1 w-1 flex-none rounded-full bg-emerald-500 dark:bg-emerald-400' />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}
