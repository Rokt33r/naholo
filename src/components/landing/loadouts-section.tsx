import { cn } from '@/lib/utils'
import { BriefingLabel } from './briefing-label'
import { InlineCode } from './inline-code'
import { CollectIntelMockup } from './mockups/collect-intel-mockup'
import { OperateTerminalMockup } from './mockups/operate-terminal-mockup'
import { RetrospectMockup } from './mockups/retrospect-mockup'
import { Section } from './section'

type Feature = {
  kicker: string
  title: string
  body: React.ReactNode
  mockup: React.ReactNode
}

const FEATURES: Feature[] = [
  {
    kicker: 'Web app · Operation tracker',
    title: "Keep every op's context in one place",
    body: (
      <>
        <p>
          Think GitHub Issues, but for AI coding. Drop intel as a note or a
          quick message, and your agents pull the full context on{' '}
          <InlineCode>/infil</InlineCode> and report back on{' '}
          <InlineCode>/exfil</InlineCode>.
        </p>
        <p>
          Messages aren&apos;t an AI-chat wrapper. Use them for short memos and
          team communication.
        </p>
      </>
    ),
    mockup: <CollectIntelMockup />,
  },
  {
    kicker: 'CLI · Skills',
    title: 'Run the whole loop from your terminal',
    body: (
      <>
        <p>
          Setup takes one step. <InlineCode>naholo init</InlineCode> connects
          the web app and installs the skills. The CLI ships optimized commands
          and an MCP server for your agents, keeping slop out and token usage
          low.
        </p>
        <p>
          The skills walk agents through the workflow, so there&apos;s nothing
          to learn up front.
        </p>
      </>
    ),
    mockup: <OperateTerminalMockup />,
  },
  {
    kicker: 'Web app · Agent stats',
    title: 'See exactly where tokens go',
    body: (
      <>
        <p>
          The CLI collects every transcript during an op and uploads it on{' '}
          <InlineCode>/exfil</InlineCode>. Transcripts are{' '}
          <strong className='font-semibold text-zinc-900 dark:text-zinc-50'>
            redacted by default
          </strong>
          , so everything but the usage data is purged, and you can opt out or
          send the full transcript at any time.
        </p>
        <p>
          Usage is broken down by skill and mode, and cost is figured at Claude
          API rates rather than subsidized plan rates.
        </p>
      </>
    ),
    mockup: <RetrospectMockup />,
  },
]

export function LoadoutsSection() {
  return (
    <Section>
      <BriefingLabel>{'// 04 · Loadouts'}</BriefingLabel>
      <h2 className='mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Plan in the browser. Ship from the terminal.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Two tools, one loop: a web app that holds the context around every
        operation, and a CLI your agents drive to do the work.
      </p>

      <div className='mt-12 space-y-12'>
        {FEATURES.map((feature, index) => {
          const mockupLeft = index % 2 === 1
          return (
            <div
              key={feature.title}
              className='grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12'
            >
              <div className={cn(mockupLeft && 'md:order-2')}>
                <div className='font-mono text-[11px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-500'>
                  {feature.kicker}
                </div>
                <h3 className='mt-2.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50'>
                  {feature.title}
                </h3>
                <div className='mt-3 space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
                  {feature.body}
                </div>
              </div>
              <div className={cn('w-full', mockupLeft && 'md:order-1')}>
                {feature.mockup}
              </div>
            </div>
          )
        })}
      </div>

      <div className='mt-12 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-[0.08em] text-zinc-500 dark:text-zinc-400'>
        <span className='text-zinc-400 dark:text-zinc-500'>GEAR CHECK:</span>
        <span>Claude Code</span>
        <span className='text-zinc-300 dark:text-zinc-600'>/</span>
        <span>macOS + Node 22+</span>
        <span className='text-zinc-400 dark:text-zinc-500'>
          Codex and Linux / Windows supported later.
        </span>
      </div>
    </Section>
  )
}
