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
import { InlineCode } from './inline-code'
import { CollectIntelMockup } from './mockups/collect-intel-mockup'
import { OperateTerminalMockup } from './mockups/operate-terminal-mockup'
import { RetrospectMockup } from './mockups/retrospect-mockup'
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
    body: 'Research the codebase and lock-in the architecture decisions before any tasks are cut.',
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
    body: 'Ship one taskl implement the change, then write an After-Action Report that flags any deviations from the plan.',
    artefacts: ['Code changes', 'After-Action Report'],
    Icon: Crosshair,
  },
  {
    index: '05',
    code: '/sitrep',
    name: 'Sitrep',
    body: 'Checkpoint mid-mission: your tasks, notes, and a summary log sync to the server without closing the operation.',
    artefacts: ['Sitrep Log', 'Server sync'],
    Icon: Radio,
  },
  {
    index: '06',
    code: '/exfil',
    name: 'Exfil',
    body: 'Close out the operation and push all local context to the server: notes, tasks, and agent usage stats.',
    artefacts: ['Debrief log', 'Server sync', 'Operation close'],
    Icon: PlaneTakeoff,
  },
]

type Step = {
  index: string
  title: string
  body: React.ReactNode
}

const STEPS: Step[] = [
  {
    index: '01',
    title: 'Collect intel',
    body: 'Drop intel into the web app: leave small ideas as comment logs and bigger ones as markdown notes. Naholo is not an AI chat wrapper, just a place to seed context. The real research and development happen in your codebase once the operation starts.',
  },
  {
    index: '02',
    title: 'Operate the cycle',
    body: (
      <>
        Put an agent on your codebase by running{' '}
        <InlineCode>{'/infil <opNum>'}</InlineCode>, which pulls the seeded
        context down through the Naholo CLI and sets up the operation. From
        there the cycle runs in order: <InlineCode>/infil</InlineCode>,{' '}
        <InlineCode>/warno</InlineCode>, <InlineCode>/opord</InlineCode>, and a{' '}
        <InlineCode>/splash</InlineCode> for each task. Loop back to{' '}
        <InlineCode>/opord</InlineCode> whenever the plan needs adjusting, then
        finish with <InlineCode>/exfil</InlineCode>.
      </>
    ),
  },
  {
    index: '03',
    title: 'Debrief the spend',
    body: (
      <>
        When you run <InlineCode>/exfil</InlineCode>, your notes and optional
        agent usage stats push back to the server. Review how the operation went
        and what it cost, measured at Claude API rates rather than subsidized
        plan rates, so the next one runs leaner.
      </>
    ),
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

export function TacticalOverview() {
  return (
    <Section>
      <BriefingLabel>{'// 03 · Tactical overview'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        One cycle. Every op.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Every operation runs the same three moves: collect intel in the web app,
        operate on your codebase through an AI skill, then retrospect once it
        ships. Here&apos;s the loop, end to end.
      </p>
      <div className='mt-12 space-y-12'>
        {STEPS.map((step) => (
          <div key={step.index}>
            <div className='grid grid-cols-1 items-center gap-8 md:grid-cols-2'>
              <div className='w-full'>
                <StepSlot index={step.index} />
              </div>
              <div>
                <div className='font-mono text-sm uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
                  {step.index}
                  <span className='mx-1.5 text-zinc-400 dark:text-zinc-600'>
                    ·
                  </span>
                  {step.title}
                </div>
                <p className='mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300'>
                  {step.body}
                </p>
              </div>
            </div>

            {step.index === '02' && (
              <>
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
                          <span className='mx-1 text-zinc-400 dark:text-zinc-600'>
                            ·
                          </span>
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
              </>
            )}
          </div>
        ))}
      </div>

      <div className='mt-10 flex flex-wrap justify-end gap-x-6 gap-y-2'>
        <Link
          href='/field-manual/quick-start'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Read more: Quick start <span aria-hidden>→</span>
        </Link>
        <Link
          href='/field-manual/workflow'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Workflow <span aria-hidden>→</span>
        </Link>
      </div>

      <div className='mt-16 border-t border-zinc-200 pt-12 dark:border-zinc-800'>
        <span className='inline-block rounded border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-600 dark:border-amber-400/40 dark:text-amber-500'>
          [ INCOMING FEATURES]
        </span>
        <ul className='mt-6 space-y-4 text-base leading-7 text-zinc-600 dark:text-zinc-300'>
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
    </Section>
  )
}

function StepSlot({ index }: { index: string }) {
  switch (index) {
    case '01':
      return <CollectIntelMockup />
    case '02':
      return <OperateTerminalMockup />
    case '03':
      return <RetrospectMockup />
    default:
      return null
  }
}
