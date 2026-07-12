import { cn } from '@/lib/utils'
import { BriefingLabel } from './briefing-label'
import { InlineCode } from './inline-code'
import { Section } from './section'

type Step = {
  title: string
  commands: string[]
  review?: string
  body: React.ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Drop the intel',
    commands: ['/infil', '/fob'],
    body: 'Leave a rough idea or a pain point in the web app, or start straight from your codebase.',
  },
  {
    title: 'Brief the direction',
    commands: ['/warno'],
    review: 'review < 5 min',
    body: 'The agent pins the conceptual solution and the architecture decisions. It writes no tasks and no code yet, just a compact bullet list.',
  },
  {
    title: 'Cut the plan',
    commands: ['/opord'],
    review: 'review < 5 min each',
    body: 'The direction is chopped into single-commit-sized tasks. There is still no code, only a description of how the interfaces and module flows change.',
  },
  {
    title: 'Ship one task',
    commands: ['/splash'],
    review: 'review < 5 min each',
    body: 'The agent ships exactly one task. Anything it improvised is flagged as a deviation for you to accept or roll back.',
  },
  {
    title: 'Continue the cycle',
    commands: [],
    body: (
      <>
        Review the next task and <InlineCode>/splash</InlineCode>, or re-run{' '}
        <InlineCode>/opord</InlineCode> to adjust the plan mid-flight.
      </>
    ),
  },
  {
    title: 'Debrief the spend',
    commands: ['/exfil'],
    body: 'It records the operation and its token usage to the server so you can look back. Weak plans cost more tokens, and now you can see exactly that.',
  },
]

export function HowItWorks() {
  return (
    <Section>
      <BriefingLabel>{'// 02 · Workflow'}</BriefingLabel>
      <h2 className='mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        One cycle. Every op.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Six small moves from a rough idea to a shipped, reviewed change. The
        agent moves fast between them; you review at every gate.
      </p>

      <ol className='mt-12 ml-4'>
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              'relative pl-8',
              index === STEPS.length - 1 ? 'pb-0' : 'pb-8',
            )}
          >
            <span
              className={cn(
                'absolute -left-[17px] top-0 flex size-8 items-center justify-center rounded-full font-mono text-[13px] bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900',
              )}
            >
              {index + 1}
            </span>

            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                {step.title}
              </span>
              {step.commands.map((command) => (
                <InlineCode key={command}>{command}</InlineCode>
              ))}
              {step.review != null && (
                <span className='rounded border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-500'>
                  {step.review}
                </span>
              )}
            </div>
            <p className='mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
