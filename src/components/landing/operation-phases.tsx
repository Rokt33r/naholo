import {
  FileText,
  Hammer,
  PlaneLanding,
  PlaneTakeoff,
  Radio,
} from 'lucide-react'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Phase = {
  index: string
  code: string
  name: string
  body: string
  artefacts: string[]
  Icon: React.ComponentType<{ className?: string }>
}

const PHASES: Phase[] = [
  {
    index: '01',
    code: '/infil',
    name: 'Infil',
    body: 'Pull the issue, notes, tasks, and log history from the server into a local worktree. Now you have the intel — and a clean baseline for later diffs.',
    artefacts: ['TASKS.md', 'PLAN.md'],
    Icon: PlaneLanding,
  },
  {
    index: '02',
    code: '/spec',
    name: 'Spec',
    body: 'Turn the brief into an executable plan. Scout the codebase, lock down architecture, write the objective list.',
    artefacts: ['SPEC.md', 'TASKS.md'],
    Icon: FileText,
  },
  {
    index: '03',
    code: '/ship',
    name: 'Ship',
    body: 'Execute the spec top to bottom. Each objective gets checked as its code lands. No improvising outside the plan.',
    artefacts: ['Code changes', 'TASKS.md'],
    Icon: Hammer,
  },
  {
    index: '04',
    code: '/sitrep',
    name: 'Sitrep',
    body: 'Push a mid-mission checkpoint. Server-side tasks, notes, and a summary log sync — no extract yet.',
    artefacts: ['Log entry', 'Server sync'],
    Icon: Radio,
  },
  {
    index: '05',
    code: '/exfil',
    name: 'Exfil',
    body: 'Close out the operation. Final sync, debrief log, and an optional close on the issue. Extract.',
    artefacts: ['Debrief log', 'Issue close'],
    Icon: PlaneTakeoff,
  },
]

export function OperationPhases() {
  return (
    <Section>
      <BriefingLabel>{'// 03 · Phase breakdown'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Five phases, one mission.
      </h2>

      <div className='mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {PHASES.map((phase) => (
          <article
            key={phase.code}
            className='rounded-lg border border-zinc-200 bg-white/50 p-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50'
          >
            <div className='flex items-center gap-2'>
              <phase.Icon className='h-5 w-5 text-amber-500 dark:text-amber-400' />
              <div className='font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>
                {phase.index}
                <span className='mx-1 text-zinc-400 dark:text-zinc-600'>·</span>
                <code className='font-mono text-amber-600 dark:text-amber-500'>
                  {phase.code}
                </code>
              </div>
            </div>

            <h3 className='mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
              {phase.name}
            </h3>
            <p className='mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
              {phase.body}
            </p>

            <ul className='mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800'>
              {phase.artefacts.map((a) => (
                <li
                  key={a}
                  className='rounded border border-zinc-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'
                >
                  {a}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}
