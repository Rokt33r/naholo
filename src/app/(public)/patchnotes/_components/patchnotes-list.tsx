'use client'

import { useState } from 'react'
import { MarkdownView } from '@/components/ui/markdown-view'
import type {
  PatchnoteEntryWithStream,
  PatchnoteStream,
} from '@/lib/patchnotes'
import { cn } from '@/lib/utils'

const STREAM_LABELS: Record<PatchnoteStream, string> = {
  web: 'Web App',
  cli: 'CLI',
}

type Filter = PatchnoteStream | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'web', label: 'Web App' },
  { key: 'cli', label: 'CLI' },
]

export function PatchnotesList({
  entries,
}: {
  entries: PatchnoteEntryWithStream[]
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible =
    filter === 'all'
      ? entries
      : entries.filter((entry) => entry.stream === filter)

  return (
    <div>
      <div className='inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800'>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type='button'
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-md px-3 py-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50',
              filter === key &&
                'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className='mt-6 text-sm text-zinc-500 dark:text-zinc-400'>
          No releases yet.
        </p>
      ) : (
        <div className='mt-6 flex flex-col gap-8'>
          {visible.map((entry) => (
            <article key={`${entry.stream}-${entry.version}`}>
              <header className='flex items-baseline gap-3'>
                <span className='rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'>
                  {STREAM_LABELS[entry.stream]}
                </span>
                <span className='font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50'>
                  {entry.version}
                </span>
                <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                  {entry.date}
                </span>
              </header>
              <MarkdownView className='mt-3'>{entry.body}</MarkdownView>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
