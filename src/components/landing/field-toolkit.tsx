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
        One command installs the workflow skills and side branches —{' '}
        <code className='font-mono'>/fob</code> (drop an idea, get an op),{' '}
        <code className='font-mono'>/recon</code> (talk-it-out),{' '}
        <code className='font-mono'>/raid</code> (small-OP shortcut),{' '}
        <code className='font-mono'>/chop</code> (split an OP) — into your AI
        agent. No copy-paste, no setup ceremony.
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
    body: 'Concurrent sessions in different worktrees register against the right OP each. No mixing.',
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
        A local CLI that wires your AI agent into the OP — MCP tools for Mission
        HQ, per-OP session tracking, worktree-safe.
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
