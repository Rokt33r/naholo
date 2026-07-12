import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Gate = {
  label: string
  skill: string
  title: string
  body: string
}

const GATES: Gate[] = [
  {
    label: 'Warning Order',
    skill: '/warno',
    title: 'Review the architecture',
    body: 'You review a handful of decisions before any plan is written. It takes a couple of minutes, and because there is no giant document, no tokens go to waste.',
  },
  {
    label: 'Operation Order',
    skill: '/opord',
    title: 'Review the plan',
    body: "Work is cut into single-commit tasks, each speccing how a module's interfaces and internal flow change. Staying at the contract level, not code, means fewer tokens to iterate and less time to review.",
  },
  {
    label: 'After-Action',
    skill: '/splash',
    title: 'Review the changes',
    body: 'Each task ships in isolation, and any improvisation is flagged as a deviation. You confirm it before you trust it in front of anyone else.',
  },
]

export function WhyItWorks() {
  return (
    <Section>
      <BriefingLabel>{'// 03 · contracts'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Three reviews carry every change.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Agents write more than any human can keep up with, so you either
        vibe-code and ship slop or burn out trying to read it all. naholo
        throttles that output into a single document, built in small, swift
        steps that you review section by section.
      </p>

      <div className='mt-12 border-b border-zinc-200 dark:border-zinc-800'>
        {GATES.map((gate) => (
          <div
            key={gate.label}
            className='grid grid-cols-1 gap-2 border-t border-zinc-200 py-6 md:grid-cols-[210px_1fr] md:gap-8 dark:border-zinc-800'
          >
            <div className='font-mono text-sm uppercase tracking-[0.1em] text-amber-600 dark:text-amber-500'>
              {gate.label}
              <div className='mt-1 text-[11px] tracking-[0.15em] text-zinc-400 dark:text-zinc-500'>
                {gate.skill}
              </div>
            </div>
            <div>
              <div className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                {gate.title}
              </div>
              <p className='mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
                {gate.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
