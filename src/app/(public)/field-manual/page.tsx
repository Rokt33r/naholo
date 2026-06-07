import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Field Manual — naholo',
}

const doors = [
  {
    href: '/field-manual/quick-start',
    label: '// 01 · Action-first',
    title: 'Quick Start →',
    body: 'Open an op, install the CLI, run the chain, ship your first operation.',
  },
  {
    href: '/field-manual/primer',
    label: '// 02 · Philosophy-first',
    title: 'Primer →',
    body: 'Why naholo exists. What it means to ship real, not delusion.',
  },
]

export default function FieldManualTopPage() {
  return (
    <div className='not-prose'>
      <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
        // 00 · Overview
      </p>
      <h1 className='mt-3 font-mono text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl'>
        This We&rsquo;ll CODE!
      </h1>

      <p className='mt-8 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        naholo is the procedure between a half-formed idea and a shipped change.
        The manual walks an operator through breaking the idea into a direction,
        the direction into a plan, and the plan into reviewable chunks the agent
        ships one at a time. At every step you get a window to review —
        direction, plan, code — without drowning yourself or the agent in
        context.
      </p>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Two ways in:{' '}
        <span className='font-semibold text-zinc-900 dark:text-zinc-50'>
          Quick Start
        </span>{' '}
        if you want to ship a first op today;{' '}
        <span className='font-semibold text-zinc-900 dark:text-zinc-50'>
          Primer
        </span>{' '}
        if you want to know why naholo exists before you touch the CLI.
      </p>

      <div className='mt-10 grid gap-6 sm:grid-cols-2'>
        {doors.map((door) => (
          <Link
            key={door.href}
            href={door.href}
            className='group block rounded-lg border border-zinc-200 bg-white p-6 !no-underline shadow-sm transition hover:border-amber-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500'
          >
            <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
              {door.label}
            </p>
            <h2 className='mt-3 text-xl font-bold text-zinc-900 dark:text-zinc-50'>
              {door.title}
            </h2>
            <p className='mt-2 text-sm text-zinc-600 dark:text-zinc-400'>
              {door.body}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
