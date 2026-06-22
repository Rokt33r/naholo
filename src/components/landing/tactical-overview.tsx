import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BriefingLabel } from './briefing-label'
import { InlineCode } from './inline-code'
import { CollectIntelMockup } from './mockups/collect-intel-mockup'
import { OperateTerminalMockup } from './mockups/operate-terminal-mockup'
import { RetrospectMockup } from './mockups/retrospect-mockup'
import { Section } from './section'

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
        <InlineCode>{'/infil <opNum>'}</InlineCode>. After each step it spells
        out what to review and what comes next, then waits on your call: wave it
        on to the next skill, or reply with a tweak to revise what it just did.
        The review is always yours; the agent just keeps you moving toward{' '}
        <InlineCode>/exfil</InlineCode>.
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
        operate on your codebase through an AI skill, then review the spend once
        it ships.
      </p>
      <div className='mt-12 space-y-12'>
        {STEPS.map((step) => (
          <div key={step.index}>
            <div className='grid grid-cols-1 items-center gap-8 md:grid-cols-2'>
              <div
                className={cn('w-full', step.index !== '02' && 'md:order-2')}
              >
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
          </div>
        ))}
      </div>

      <div className='mt-10 flex flex-wrap justify-end'>
        <Link
          href='/field-manual/quick-start'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Read more: Quick start <span aria-hidden>→</span>
        </Link>
      </div>
      <div className='mt-6 flex flex-wrap justify-end'>
        <Link
          href='/field-manual/workflow'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Read more: Workflow <span aria-hidden>→</span>
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
