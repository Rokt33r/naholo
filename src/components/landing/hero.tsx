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
          <BriefingLabel>{'// 01 · Mission briefing'}</BriefingLabel>
          <span className='font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>
            [ CLEARANCE: OPERATOR ] · [ OP.NAHOLO ]
          </span>
        </div>

        <div className='relative mt-10 max-w-3xl'>
          <CornerBrackets />
          <h1 className='text-4xl font-bold leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl lg:text-7xl'>
            Coding ops,
            <br />
            end to end
            <span className='font-mono text-amber-600 dark:text-amber-500'>
              .
            </span>
          </h1>

          <p className='mt-8 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg'>
            AI coding without the vicious spiral. Infil into the codebase, brief
            the task, ship in splashes, exfil with the diff — under your
            command, not the model&apos;s.
          </p>

          <div className='mt-10 flex flex-wrap items-center gap-4'>
            {isAuthed ? (
              <Button asChild size='lg'>
                <Link href='/app'>Enter ops room</Link>
              </Button>
            ) : (
              <>
                <Button asChild size='lg'>
                  <Link href='/sign-up'>Begin operation</Link>
                </Button>
                <Button asChild variant='outline' size='lg'>
                  <Link href='/sign-in'>Sign in</Link>
                </Button>
              </>
            )}
          </div>

          <div className='mt-6'>
            <Link
              href='/field-manual/quick-start'
              className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400'
            >
              Read more: Quick start <span aria-hidden>→</span>
            </Link>
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
