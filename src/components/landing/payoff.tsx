import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Stat = {
  value: string
  footnoted?: boolean
  body: string
}

const STATS: Stat[] = [
  {
    value: '< 5 min',
    body: 'to review each checkpoint. Every window is sized to hold in one sitting, so you never drown in diffs.',
  },
  {
    value: '30–60%',
    footnoted: true,
    body: 'fewer tokens burned. Throttled planning per phase means less wasted context.',
  },
  {
    value: '~3×',
    footnoted: true,
    body: 'throughput. One operator shipped a 5-day task in 1.5 days.',
  },
]

export function Payoff() {
  return (
    <Section>
      <BriefingLabel>{"// 01 · Why it's worth it"}</BriefingLabel>

      <div className='mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800'>
        {STATS.map((stat) => (
          <div key={stat.value} className='bg-zinc-50 p-8 dark:bg-zinc-950'>
            <div className='text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50'>
              {stat.value}
              {stat.footnoted === true && (
                <span className='text-xl text-zinc-400 dark:text-zinc-600'>
                  *
                </span>
              )}
            </div>
            <p className='mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
              {stat.body}
            </p>
          </div>
        ))}
      </div>

      <p className='mt-4 font-mono text-[11px] tracking-[0.06em] text-zinc-400 dark:text-zinc-500'>
        * Early results are anecdotal. The &lt; 5 min review window is a design
        guarantee.
      </p>
    </Section>
  )
}
