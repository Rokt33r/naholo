import {
  ArrowDownFromLine,
  Crosshair,
  ListChecks,
  PlaneTakeoff,
  Radio,
  Siren,
} from 'lucide-react'
import Link from 'next/link'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Command = {
  index: string
  code: string
  name: string
  body: string
  artefacts: string[]
  Icon: React.ComponentType<{ className?: string }>
}

const COMMANDS: Command[] = [
  {
    index: '01',
    code: '/infil',
    name: 'Infil',
    body: 'Pull notes, tasks, and logs from the server into a local working dir.',
    artefacts: ['OPERATION', 'TASKS'],
    Icon: ArrowDownFromLine,
  },
  {
    index: '02',
    code: '/warno',
    name: 'Warno',
    body: 'Research the codebase and lock in the architecture decisions before any tasks are cut.',
    artefacts: ['WARNING ORDER'],
    Icon: Siren,
  },
  {
    index: '03',
    code: '/opord',
    name: 'Opord',
    body: 'Cut the WARNO into single-commit-sized tasks. Each task ships in one splash.',
    artefacts: ['OPERATION ORDER', 'TASKS'],
    Icon: ListChecks,
  },
  {
    index: '04',
    code: '/splash',
    name: 'Splash',
    body: 'Ship one task. Implement, verify, write the After-Action Report highlighting deviations during implementation.',
    artefacts: ['Code changes', 'After-Action Report'],
    Icon: Crosshair,
  },
  {
    index: '05',
    code: '/sitrep',
    name: 'Sitrep',
    body: 'Push a mid-mission checkpoint. Server-side tasks, notes, and a summary log sync — no extract yet.',
    artefacts: ['Sitrep Log', 'Server sync'],
    Icon: Radio,
  },
  {
    index: '06',
    code: '/exfil',
    name: 'Exfil',
    body: 'Close out the operation. Final sync, debrief log, and an optional close on the issue. Extract.',
    artefacts: ['Debrief log', 'Server sync', 'Operation close'],
    Icon: PlaneTakeoff,
  },
]

const TACTIC_DIAGRAM = `┌────────────────────────────────────────────────────────┐
│  Mission HQ: Naholo web app                            │
│                                                        │
│  [Ideation: Drop intel as logs or notes]               │
└────────────────────────────────────────────────────────┘
  │ /infil           ^ /sitrep          ^ /exfil
  v (pull OP data)   │ (push OP data)   │ (push + close)
┌────────────────────────────────────────────────────────┐
│ Battlefield: Your codebase                             │
│                                                        │
│ /warno (write architecture decisions)                  │
│          ↓                                             │
│   [Review architecture decisions]                      │
│          ↓                                             │
│ /opord (cut into single-commit tasks)                  │
│          ↓                                             │
│   [Review specs]                                       │
│          ↓                                             │
│ /splash (ship one task)  ◂┐                            │
│          ↓                │ [Repeat]                   │
│   [Review diff]           │ (/opord if revising tasks) │
│          └────────────────┘                            │
└────────────────────────────────────────────────────────┘`

export function TacticalOverview() {
  return (
    <Section>
      <BriefingLabel>{'// 03 · Tactical overview'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        One cycle. Every op.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Two landscapes, one loop. Intel lives in Mission HQ. Code lives in the
        battlefield. AI skills sync between them or operate on the ground.
      </p>

      <div className='mt-12 flex justify-center'>
        <pre className='overflow-x-auto rounded-lg border border-zinc-200 bg-white/40 p-3 font-mono text-xs leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 sm:text-sm max-[480px]:-mx-4 max-[480px]:p-2 max-[480px]:text-[10px] max-[400px]:text-[8px]'>
          {TACTIC_DIAGRAM}
        </pre>
      </div>

      <div className='mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {COMMANDS.map((cmd) => (
          <article
            key={cmd.code}
            className='rounded-lg border border-zinc-200 bg-white/50 p-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50'
          >
            <div className='flex items-center gap-2'>
              <cmd.Icon className='h-5 w-5 text-amber-500 dark:text-amber-400' />
              <div className='font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>
                {cmd.index}
                <span className='mx-1 text-zinc-400 dark:text-zinc-600'>·</span>
                <code className='font-mono text-amber-600 dark:text-amber-500'>
                  {cmd.code}
                </code>
              </div>
            </div>

            <h3 className='mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
              {cmd.name}
            </h3>
            <p className='mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
              {cmd.body}
            </p>

            <ul className='mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800'>
              {cmd.artefacts.map((a) => (
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

      <div className='mt-10 flex justify-end'>
        <Link
          href='/field-manual/workflow'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Read more: Workflow <span aria-hidden>→</span>
        </Link>
      </div>
    </Section>
  )
}
