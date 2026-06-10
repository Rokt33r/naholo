import type { Metadata } from 'next'
import Link from 'next/link'
import { chapterHref, chapters } from './chapters'

export const metadata: Metadata = {
  title: 'Field Manual — naholo',
}

export default function FieldManualTopPage() {
  return (
    <div className='not-prose'>
      <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
        // 00 · Overview
      </p>

      <p className='prose mt-8 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        naholo provides the procedure between a half-formed idea and a shipped
        change. The manual walks an operator through breaking the idea into a
        direction, the direction into a plan, and the plan into reviewable
        chunks the agent ships one at a time. At every step you get a window to
        review — direction, plan, code — without drowning yourself or the agent
        in context.
      </p>

      <div className='mt-6 max-w-2xl space-y-3'>
        {chapters
          .filter((chapter) => chapter.slug !== '')
          .map((chapter) => (
            <Link
              key={chapter.slug}
              href={chapterHref(chapter)}
              className='group block rounded-md border border-zinc-200 bg-white px-3 py-2 !no-underline transition hover:border-amber-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500'
            >
              <h2 className='font-mono text-base font-semibold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-500 mb-2'>
                {`${chapter.number}·${chapter.label} →`}
              </h2>
              <p className='text-sm leading-snug text-zinc-600 dark:text-zinc-400'>
                {chapter.body}
              </p>
            </Link>
          ))}
      </div>
    </div>
  )
}
