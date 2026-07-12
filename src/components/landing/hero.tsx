import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BriefingLabel } from './briefing-label'
import { GridBackdrop } from './grid-backdrop'
import { Section } from './section'

export function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <Section className='relative overflow-hidden'>
      <GridBackdrop />

      <div className='relative z-10'>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
          <BriefingLabel>{'// naholo · coding ops, end to end'}</BriefingLabel>
          <span className='font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>
            [ CLEARANCE: OPERATOR ]
          </span>
        </div>

        <div className='relative mt-10 max-w-3xl'>
          <CornerBrackets />
          <h1 className='text-4xl font-bold leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl lg:text-7xl'>
            Stop babysitting your AI.
            <br />
            Start commanding it
            <span className='font-mono text-amber-600 dark:text-amber-500'>
              .
            </span>
          </h1>

          <p className='mt-8 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg'>
            naholo runs your AI coding through one disciplined loop of{' '}
            <strong className='font-semibold text-zinc-900 dark:text-zinc-50'>
              brief → plan → ship → debrief
            </strong>
            . Every phase is chopped into review windows small enough to
            actually read so you stay in command while the agent does the
            chores.
          </p>

          <div className='mt-10 flex flex-wrap items-center gap-4'>
            {isAuthed ? (
              <Button asChild size='lg'>
                <Link href='/app'>Enter ops room</Link>
              </Button>
            ) : (
              <Button asChild size='lg'>
                <Link href='/sign-up'>Begin operation</Link>
              </Button>
            )}
            <Button asChild variant='outline' size='lg'>
              <Link href='/field-manual'>Read the Field Manual</Link>
            </Button>
            <span className='ml-1 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500'>
              <span aria-hidden>●</span> open source · MIT
            </span>
          </div>
        </div>
      </div>
    </Section>
  )
}

function CornerBrackets() {
  const base =
    'pointer-events-none absolute h-4 w-4 border-amber-500/60 dark:border-amber-400/60'
  return (
    <>
      <span
        aria-hidden='true'
        className={`${base} -left-3 -top-3 border-l-2 border-t-2`}
      />
      <span
        aria-hidden='true'
        className={`${base} -right-3 -top-3 border-r-2 border-t-2`}
      />
      <span
        aria-hidden='true'
        className={`${base} -bottom-3 -left-3 border-b-2 border-l-2`}
      />
      <span
        aria-hidden='true'
        className={`${base} -bottom-3 -right-3 border-b-2 border-r-2`}
      />
    </>
  )
}
