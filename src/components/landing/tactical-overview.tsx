import {
  ArrowDownFromLine,
  Blocks,
  FileText,
  PlaneTakeoff,
  Radio,
} from 'lucide-react'
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
    body: 'Pull notes, objectives, and logs from the server into a local codebase. Now you have the intel — and a clean baseline for later diffs.',
    artefacts: ['OPERATION.md'],
    Icon: ArrowDownFromLine,
  },
  {
    index: '02',
    code: '/spec',
    name: 'Spec',
    body: 'Turn the brief into an executable plan. Scout the codebase, lock down architecture, write the objective list.',
    artefacts: ['SPEC.md', 'OBJECTIVES.md'],
    Icon: FileText,
  },
  {
    index: '03',
    code: '/ship',
    name: 'Ship',
    body: 'Execute the spec top to bottom. Each objective gets checked as its code lands. No improvising outside the plan.',
    artefacts: ['Code changes', 'OBJECTIVES.md'],
    Icon: Blocks,
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
    artefacts: ['Debrief log', 'Operation close'],
    Icon: PlaneTakeoff,
  },
]

const TACTIC_DIAGRAM = `┌─────────────────────────────────────────────────────────────────┐
│  Mission HQ: Naholo web app                                     │
│                                                                 │
│  [Ideation: Drop intel as logs or notes]                        │
└─────────────────────────────────────────────────────────────────┘
       │                        ^                         ^
       │ /infil                 │ /sitrep                 │ /exfil
       v                        │ (run anytime)           │
┌─────────────────────────────────────────────────────────────────┐
│  Battlefield: Your codebase                                     │
│                                                                 │
│  [Review summary] ──/spec──▸ [Review spec] ──/ship──▸ [Review]  │
│       PLAN.md                  SPEC.md                  diff    │
└─────────────────────────────────────────────────────────────────┘`

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
        <pre className='overflow-x-auto rounded-lg border border-zinc-200 bg-white/40 p-4 font-mono text-xs leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 sm:text-sm'>
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
    </Section>
  )
}
