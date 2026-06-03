'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type ReprocessResult =
  | { ok: true; hasStats: boolean; errorCount: number }
  | { ok: false; reason: 'not_found' | 'no_transcript' }

export function ReprocessRowButton({ transcriptId }: { transcriptId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    setMessage(null)
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/agent-transcripts/${transcriptId}/reprocess`,
        { method: 'POST' },
      )
      if (!response.ok && response.status !== 404) {
        setMessage(`Failed (${response.status})`)
        return
      }
      const data = (await response.json()) as ReprocessResult
      if (!data.ok) {
        setMessage(data.reason === 'not_found' ? 'Not found' : 'No transcript')
        return
      }
      setMessage(
        data.hasStats
          ? `Reprocessed (${data.errorCount} errors)`
          : `Reprocessed (no stats, ${data.errorCount} errors)`,
      )
      router.refresh()
    })
  }

  return (
    <span className='inline-flex items-center gap-2'>
      <button
        type='button'
        onClick={handleClick}
        disabled={isPending}
        className='rounded border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
      >
        {isPending ? 'Reprocessing…' : 'Reprocess'}
      </button>
      {message != null ? (
        <span className='text-xs text-zinc-500 dark:text-zinc-400'>
          {message}
        </span>
      ) : null}
    </span>
  )
}
