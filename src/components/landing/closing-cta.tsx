import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

export function ClosingCTA({ isAuthed }: { isAuthed: boolean }) {
  return (
    <Section className='border-b-0'>
      <div className='mx-auto max-w-2xl text-center'>
        <BriefingLabel className='justify-center'>
          {'// 06 · Deployment'}
        </BriefingLabel>
        <h2 className='mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
          Ready to deploy?
        </h2>
        <p className='mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300'>
          Stand up your first operation, or fork it and spin up your own
          instance. Available under Apache 2.0 as open source.
        </p>

        <div className='mt-10 flex flex-wrap items-center justify-center gap-4'>
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
          <Button asChild variant='outline' size='lg'>
            <a
              href='https://github.com/Rokt33r/naholo'
              target='_blank'
              rel='noopener noreferrer'
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height='16'
                width='16'
                src='https://unpkg.com/simple-icons@v16/icons/github.svg'
                alt='GitHub'
                className='dark:invert'
              />
              View on GitHub
            </a>
          </Button>
        </div>

        <div className='mt-12 flex flex-wrap items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>
          <span className='inline-flex items-center gap-2'>
            <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400' />
            [ STATUS: ONLINE ]
          </span>
          <span>·</span>
          <span>[ OPERATORS STANDING BY ]</span>
        </div>
      </div>
    </Section>
  )
}
