import { TowerControl, VenetianMask } from 'lucide-react'
import Link from 'next/link'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

export function ClearanceClassification() {
  return (
    <Section>
      <BriefingLabel>{'// 06 · Clearance classification'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Classify your project.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        The loop is the same either way; what changes is how naholo lives in
        your codebase. Classify your project by how much control you have over
        it.
      </p>

      <div className='mt-12 grid grid-cols-1 gap-6 md:grid-cols-2'>
        {/* Covert Ops */}
        <article className='flex flex-col rounded-lg border border-zinc-200 bg-white/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/50'>
          <div className='flex items-center gap-3'>
            <VenetianMask className='h-5 w-5 text-amber-500 dark:text-amber-400' />
            <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
              Covert
            </span>
          </div>
          <h3 className='mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
            Covert Ops
          </h3>
          <p className='mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
            You deploy into territory you don&apos;t control, so no base goes
            up: nothing is committed and no trace is left behind. Your kit stays
            in your ruck (
            <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
              ~/.naholo
            </code>
            ). Run{' '}
            <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
              naholo covert init
            </code>{' '}
            and go dark.
          </p>
          <p className='mt-6 border-t border-zinc-200 pt-6 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300'>
            Choose this when you&apos;re working on a team project but
            don&apos;t want to, or can&apos;t, introduce naholo to the rest of
            the team. You&apos;ll need to run{' '}
            <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
              naholo covert init
            </code>{' '}
            each time you create a new worktree.
          </p>
        </article>

        {/* Full Control */}
        <article className='flex flex-col rounded-lg border border-zinc-200 bg-white/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/50'>
          <div className='flex items-center gap-3'>
            <TowerControl className='h-5 w-5 text-amber-500 dark:text-amber-400' />
            <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
              Full Control
            </span>
          </div>
          <h3 className='mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
            Full Control
          </h3>
          <p className='mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
            This is your territory, so you set the rules. Deploy a full base at{' '}
            <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
              .naholo/
            </code>{' '}
            in the project root with config checked into source, so every
            operator runs the same loop. Run{' '}
            <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
              naholo init
            </code>{' '}
            and push forward with your team.
          </p>
          <p className='mt-6 border-t border-zinc-200 pt-6 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300'>
            Choose this when you own the repo or have the authority to introduce
            naholo to your team. Config lives in source, so new worktrees work
            out of the box; no extra setup required.
          </p>
        </article>
      </div>

      <div className='mt-10 flex justify-end'>
        <Link
          href='/field-manual/readiness#pick-an-init-mode'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Read more: Pick an init mode <span aria-hidden>→</span>
        </Link>
      </div>
    </Section>
  )
}
