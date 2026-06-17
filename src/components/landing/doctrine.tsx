import { Gauge, Stone, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type DoctrineCard = {
  title: string
  bullets: string[]
  Icon: React.ComponentType<{ className?: string }>
}

const DOCTRINES: DoctrineCard[] = [
  {
    title: 'Discipline',
    bullets: [
      'One solid loop: brief → plan → ship → debrief. No vibe-coding spirals.',
      'Work breaks down into reviewable chunks: architecture decisions land in the plan, then the plan is chopped into single-commit-sized tasks.',
      'The loop fully covers mid-session pivots, flexible but durable. A request that contradicts an architecture decision raises a review flag, so you decide whether to abort or override it.',
    ],
    Icon: ShieldAlert,
  },
  {
    title: 'Ruggedized context',
    bullets: [
      "Naholo's skills make agents keep durable, user-controllable context in the filesystem.",
      'OPERATION.md holds the canonical state of the operation, and TIMELINE.md tracks progress and any course changes.',
      'You never run /compact. When an agent starts hallucinating or the context window fills up, open a new session and it catches up on the operation instantly.',
    ],
    Icon: Stone,
  },
  {
    title: 'Transparent spend',
    bullets: [
      'Token usage pins to the OP, not just a chat thread, and uploads to the server on exfil.',
      'Review token usage and estimated budgets per skill and per session.',
      'A project-wide token usage and budget dashboard is under construction.',
    ],
    Icon: Gauge,
  },
]

export function Doctrine() {
  return (
    <Section>
      <BriefingLabel>{'// 02 · Doctrine'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Built for developers, not vibe coders.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Ship every change through a written, military-style OP cycle that stays
        disciplined, recoverable, and accountable. A web app plans the ops, a
        CLI gives agents every tool they need in your codebase, and AI skills
        drive the cycle.
      </p>

      <div className='mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {DOCTRINES.map((d) => (
          <article
            key={d.title}
            className='flex flex-col rounded-lg border border-zinc-200 bg-white/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/50'
          >
            <div className='flex items-center gap-3'>
              <d.Icon className='h-5 w-5 text-amber-500 dark:text-amber-400' />
              <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
                {d.title}
              </span>
            </div>
            <ul className='mt-6 space-y-2 border-t border-zinc-200 pt-6 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300'>
              {d.bullets.map((b) => (
                <li key={b} className='flex items-start gap-2'>
                  <span className='mt-2 h-1 w-1 flex-none rounded-full bg-emerald-500 dark:bg-emerald-400' />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className='mt-10 flex justify-end'>
        <Link
          href='/field-manual/primer'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Read more: Primer <span aria-hidden>→</span>
        </Link>
      </div>
    </Section>
  )
}
