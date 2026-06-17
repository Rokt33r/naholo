import Link from 'next/link'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Beat = {
  title: string
  body: React.ReactNode
}

const BEATS: Beat[] = [
  {
    title: 'Skill installation',
    body: (
      <>
        One command installs the workflow skills into your AI agent, along with
        the side branches:{' '}
        <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
          /fob
        </code>{' '}
        starts an OP from the codebase,{' '}
        <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
          /recon
        </code>{' '}
        talks one out,{' '}
        <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
          /raid
        </code>{' '}
        is the small-OP shortcut, and{' '}
        <code className='rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800'>
          /chop
        </code>{' '}
        splits an OP.
      </>
    ),
  },
  {
    title: 'MCP server',
    body: 'Basic OP operations (create OP, log a comment, CRUD a task, close out) are exposed via MCP. The agent drives Mission HQ from the battlefield without leaving its loop.',
  },
  {
    title: 'Agent session tracking',
    body: "Every agent session pins to the active OP. Usage shows up in the web app's per-OP stats on exfil.",
  },
  {
    title: 'Worktree-aware',
    body: 'Concurrent sessions in different worktrees each register against the right OP, so nothing gets crossed.',
  },
]

export function FieldToolkit() {
  return (
    <Section>
      <BriefingLabel>{'// 05 · Field toolkit'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Skills and tools on the ground.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        A local CLI wires your AI agent into the OP: it exposes MCP tools and
        commands for Mission HQ, tracks each session per OP, and stays
        worktree-safe.
      </p>

      <ul className='mt-10 max-w-3xl space-y-4 text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        {BEATS.map((beat) => (
          <li key={beat.title} className='flex items-start gap-3'>
            <span className='mt-2 h-1 w-1 flex-none rounded-full bg-emerald-500 dark:bg-emerald-400' />
            <span>
              <strong className='font-semibold text-zinc-900 dark:text-zinc-50'>
                {beat.title}
              </strong>
              {' — '}
              {beat.body}
            </span>
          </li>
        ))}
      </ul>

      <div className='mt-10 flex justify-end'>
        <Link
          href='/field-manual/logistics'
          className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
        >
          Read more: Logistics <span aria-hidden>→</span>
        </Link>
      </div>
    </Section>
  )
}
