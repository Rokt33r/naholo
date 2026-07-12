import Link from 'next/link'
import { chapterHref, chapters, type Chapter } from './chapters'

export function ChapterPager({ slug }: { slug: string }) {
  const index = chapters.findIndex((chapter) => chapter.slug === slug)
  if (index < 0) {
    return null
  }
  const prev = index > 0 ? chapters[index - 1] : null
  const next = index < chapters.length - 1 ? chapters[index + 1] : null

  return (
    <nav className='not-prose mt-12 grid gap-3 sm:grid-cols-2'>
      {prev ? <PagerCard chapter={prev} direction='prev' /> : <div />}
      {next ? <PagerCard chapter={next} direction='next' /> : <div />}
    </nav>
  )
}

function PagerCard({
  chapter,
  direction,
}: {
  chapter: Chapter
  direction: 'prev' | 'next'
}) {
  const isNext = direction === 'next'
  return (
    <Link
      href={chapterHref(chapter)}
      className={
        'group block rounded-md border border-zinc-200 bg-white px-3 py-2 !no-underline transition hover:border-amber-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-500 ' +
        (isNext ? 'sm:text-right' : '')
      }
    >
      <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>
        {isNext ? 'Next →' : '← Prev'}
      </p>
      <p className='mt-0.5 font-mono text-sm font-semibold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-500'>
        {`${chapter.number}·${chapter.label}`}
      </p>
      <p className='mt-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400'>
        {chapter.body}
      </p>
    </Link>
  )
}
