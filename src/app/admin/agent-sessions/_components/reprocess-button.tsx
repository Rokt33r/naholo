'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function ReprocessButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const response = await fetch('/api/admin/agent-sessions/reprocess', {
        method: 'POST',
      })
      if (!response.ok) {
        setResult(`Failed (${response.status})`)
        return
      }
      const data = (await response.json()) as {
        processed: number
        failed: number
      }
      setResult(`Processed ${data.processed}, failed ${data.failed}`)
      router.refresh()
    })
  }

  return (
    <div className='flex items-center gap-3'>
      <button
        type='button'
        onClick={handleClick}
        disabled={isPending}
        className='rounded border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
      >
        {isPending ? 'Re-processing…' : 'Re-process unparsed'}
      </button>
      {result != null ? (
        <span className='text-sm text-zinc-500 dark:text-zinc-400'>
          {result}
        </span>
      ) : null}
    </div>
  )
}
