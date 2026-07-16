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

  const filtered =
    filter === 'all'
      ? entries
      : entries.filter((entry) => entry.stream === filter)

  const visible = [...filtered].sort(comparePatchnotes)

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
                <span className='rounded bg-zinc-100 px-2.5 py-0.5 text-xl font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'>
                  {STREAM_LABELS[entry.stream]}
                </span>
                <span className='font-mono text-xl font-bold text-zinc-900 dark:text-zinc-50'>
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

function comparePatchnotes(
  a: PatchnoteEntryWithStream,
  b: PatchnoteEntryWithStream,
): number {
  const byDate = b.date.localeCompare(a.date)
  if (byDate !== 0) {
    return byDate
  }
  if (a.stream !== b.stream) {
    return a.stream === 'cli' ? -1 : 1
  }
  return compareVersionsDesc(a.version, b.version)
}

function compareVersionsDesc(a: string, b: string): number {
  const aParts = a.split('.')
  const bParts = b.split('.')
  const length = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < length; i++) {
    const aPart = parseInt(aParts[i] ?? '0', 10) || 0
    const bPart = parseInt(bParts[i] ?? '0', 10) || 0
    if (aPart !== bPart) {
      return bPart - aPart
    }
  }
  return 0
}
